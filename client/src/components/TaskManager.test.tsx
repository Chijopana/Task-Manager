import { beforeEach, describe, expect, test, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from 'react-hot-toast'
import type { Task, TaskList } from '@task-manager/shared'

import { TaskManager } from './TaskManager'
import * as taskService from '../services/taskService'

vi.mock('../services/taskService')

const mocked = vi.mocked(taskService)

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Comprar pan',
    completed: false,
    dueDate: null,
    priority: 'medium',
    tags: [],
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    completedAt: null,
    ...overrides,
  }
}

function makeList(tasks: Task[]): TaskList {
  const completed = tasks.filter((t) => t.completed).length
  return {
    tasks,
    page: 1,
    limit: 50,
    total: tasks.length,
    hasMore: false,
    counts: { all: tasks.length, pending: tasks.length - completed, completed, overdue: 0 },
    tags: [],
  }
}

function renderManager() {
  return render(
    <>
      <TaskManager />
      <Toaster />
    </>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocked.fetchTasks.mockResolvedValue(makeList([makeTask()]))
})

describe('carga', () => {
  test('muestra las tareas que devuelve la API', async () => {
    renderManager()

    expect(await screen.findByText('Comprar pan')).toBeInTheDocument()
  })

  test('un error deja reintentar en vez de parecer una lista vacía', async () => {
    mocked.fetchTasks.mockRejectedValueOnce(new Error('No se pudo conectar con el servidor'))
    renderManager()

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('No se pudo conectar con el servidor')).toBeInTheDocument()

    mocked.fetchTasks.mockResolvedValue(makeList([makeTask()]))
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await screen.findByText('Comprar pan')).toBeInTheDocument()
  })

  /**
   * El servicio gratuito duerme el servidor. Sin este aviso son treinta
   * segundos de rueda girando sin ninguna explicación.
   */
  test('a los 3 segundos explica que el servidor está despertando', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mocked.fetchTasks.mockReturnValue(new Promise(() => {}))

    renderManager()
    expect(screen.getByText(/cargando tareas/i)).toBeInTheDocument()

    // El aviso lo dispara un temporizador, así que el cambio de estado tiene
    // que entrar en el mismo `act` que el avance del reloj.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100)
    })

    expect(screen.getByText(/despertando/i)).toBeInTheDocument()
    vi.useRealTimers()
  })

  test('sin tareas invita a crear la primera', async () => {
    mocked.fetchTasks.mockResolvedValue(makeList([]))
    renderManager()

    expect(await screen.findByText('No tienes tareas aún')).toBeInTheDocument()
  })
})

describe('completar', () => {
  /**
   * Antes cada clic esperaba la respuesta del servidor antes de mover nada en
   * pantalla; con el servicio dormido eso son treinta segundos de casilla
   * bloqueada para marcar una tarea como hecha.
   */
  test('la casilla cambia al instante, sin esperar al servidor', async () => {
    let resolveUpdate: (task: Task) => void = () => {}
    mocked.updateTask.mockReturnValue(
      new Promise<Task>((resolve) => {
        resolveUpdate = resolve
      }),
    )

    renderManager()
    const toggle = await screen.findByRole('button', { name: /marcar .* como completada/i })

    await userEvent.click(toggle)

    // La petición sigue en el aire y la interfaz ya se ha actualizado.
    expect(mocked.updateTask).toHaveBeenCalledWith('t1', { completed: true })
    expect(
      await screen.findByRole('button', { name: /marcar .* como pendiente/i }),
    ).toBeInTheDocument()

    resolveUpdate(makeTask({ completed: true, completedAt: '2026-06-01T12:00:00.000Z' }))
  })

  test('si el servidor falla, el cambio se deshace y se avisa', async () => {
    mocked.updateTask.mockRejectedValue(new Error('No se pudo actualizar la tarea'))

    renderManager()
    await userEvent.click(await screen.findByRole('button', { name: /como completada/i }))

    // Vuelve a estar pendiente.
    expect(
      await screen.findByRole('button', { name: /marcar .* como completada/i }),
    ).toBeInTheDocument()
    expect(await screen.findByText('No se pudo actualizar la tarea')).toBeInTheDocument()
  })
})

describe('editar', () => {
  test('guardar con Enter manda solo el título nuevo', async () => {
    mocked.updateTask.mockResolvedValue(makeTask({ title: 'Comprar leche' }))
    renderManager()

    await userEvent.click(await screen.findByRole('button', { name: /editar "comprar pan"/i }))
    const input = screen.getByRole('textbox', { name: /editar el título/i })
    await userEvent.clear(input)
    await userEvent.type(input, 'Comprar leche{Enter}')

    await waitFor(() =>
      expect(mocked.updateTask).toHaveBeenCalledWith('t1', { title: 'Comprar leche' }),
    )
  })

  test('guardar sin haber cambiado nada no manda ninguna petición', async () => {
    renderManager()

    await userEvent.click(await screen.findByRole('button', { name: /editar "comprar pan"/i }))
    const input = screen.getByRole('textbox', { name: /editar el título/i })
    await userEvent.type(input, '{Enter}')

    expect(mocked.updateTask).not.toHaveBeenCalled()
  })

  test('Escape descarta los cambios', async () => {
    renderManager()

    await userEvent.click(await screen.findByRole('button', { name: /editar "comprar pan"/i }))
    const input = screen.getByRole('textbox', { name: /editar el título/i })
    await userEvent.clear(input)
    await userEvent.type(input, 'Otra cosa{Escape}')

    expect(mocked.updateTask).not.toHaveBeenCalled()
    expect(await screen.findByText('Comprar pan')).toBeInTheDocument()
  })

  /**
   * Guardar en `blur` era lo que disparaba un PUT a /api/tasks/null después de
   * cancelar. Ahora el foco perdido cancela, que es lo que no puede perder datos.
   */
  test('hacer clic fuera cierra la edición sin guardar ni dejarla abierta', async () => {
    renderManager()

    await userEvent.click(await screen.findByRole('button', { name: /editar "comprar pan"/i }))
    const input = screen.getByRole('textbox', { name: /editar el título/i })
    await userEvent.clear(input)
    await userEvent.type(input, 'A medias')
    await userEvent.tab()

    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: /editar el título/i })).not.toBeInTheDocument(),
    )
    expect(mocked.updateTask).not.toHaveBeenCalled()
    expect(screen.getByText('Comprar pan')).toBeInTheDocument()
  })
})

describe('borrar', () => {
  test('ofrece deshacer en vez de pedir confirmación antes', async () => {
    mocked.deleteTask.mockResolvedValue(undefined)
    mocked.createTask.mockResolvedValue(makeTask({ id: 't2' }))

    renderManager()
    await userEvent.click(await screen.findByRole('button', { name: /eliminar "comprar pan"/i }))

    await waitFor(() => expect(mocked.deleteTask).toHaveBeenCalledWith('t1'))

    const undo = await screen.findByRole('button', { name: /deshacer/i })
    await userEvent.click(undo)

    // Se recrea con los mismos datos: el identificador es nuevo, el contenido no.
    await waitFor(() =>
      expect(mocked.createTask).toHaveBeenCalledWith({
        title: 'Comprar pan',
        dueDate: null,
        priority: 'medium',
        tags: [],
      }),
    )
  })
})

describe('crear', () => {
  test('la tarea aparece antes de que responda el servidor', async () => {
    let resolveCreate: (task: Task) => void = () => {}
    mocked.createTask.mockReturnValue(
      new Promise<Task>((resolve) => {
        resolveCreate = resolve
      }),
    )

    renderManager()
    await screen.findByText('Comprar pan')

    const input = screen.getByRole('textbox', { name: /título de la tarea nueva/i })
    await userEvent.type(input, 'Sacar la basura')
    await userEvent.click(screen.getByRole('button', { name: /^añadir$/i }))

    expect(await screen.findByText('Sacar la basura')).toBeInTheDocument()

    resolveCreate(makeTask({ id: 't3', title: 'Sacar la basura' }))
  })

  test('si falla la creación, la tarea desaparece y se avisa', async () => {
    mocked.createTask.mockRejectedValue(new Error('No se pudo crear la tarea'))

    renderManager()
    await screen.findByText('Comprar pan')

    await userEvent.type(
      screen.getByRole('textbox', { name: /título de la tarea nueva/i }),
      'Fantasma',
    )
    await userEvent.click(screen.getByRole('button', { name: /^añadir$/i }))

    expect(await screen.findByText('No se pudo crear la tarea')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Fantasma')).not.toBeInTheDocument())
  })
})

describe('filtros', () => {
  test('cambiar de pestaña vuelve a preguntar con el filtro aplicado', async () => {
    renderManager()
    await screen.findByText('Comprar pan')

    await userEvent.click(screen.getByRole('tab', { name: /pendientes/i }))

    await waitFor(() =>
      expect(mocked.fetchTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'pending' }),
      ),
    )
  })

  test('manda el día del cliente, no confía en el reloj del servidor', async () => {
    renderManager()

    await waitFor(() =>
      expect(mocked.fetchTasks).toHaveBeenCalledWith(
        expect.objectContaining({ today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
      ),
    )
  })
})
