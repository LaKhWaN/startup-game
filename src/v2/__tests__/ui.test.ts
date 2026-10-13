import { beforeEach, describe, expect, it } from 'vitest'
import { closeModal, openModal, selectLot, showCity, showOffice, uiStore } from '../ui'

beforeEach(() => uiStore.setState(uiStore.getInitialState()))

describe('ui store', () => {
  it('starts in the office with nothing open', () => {
    expect(uiStore.getState()).toMatchObject({ view: 'office', modal: null, citySelection: null })
  })

  it('opens and closes modals, one at a time', () => {
    openModal({ kind: 'team' })
    expect(uiStore.getState().modal).toEqual({ kind: 'team' })
    openModal({ kind: 'person', id: 'h1' })
    expect(uiStore.getState().modal).toEqual({ kind: 'person', id: 'h1' })
    closeModal()
    expect(uiStore.getState().modal).toBeNull()
  })

  it('switches to the city and back, clearing modal and selection', () => {
    openModal({ kind: 'team' })
    showCity()
    expect(uiStore.getState()).toMatchObject({ view: 'city', modal: null })
    selectLot('villa')
    expect(uiStore.getState().citySelection).toBe('villa')
    showOffice()
    expect(uiStore.getState()).toMatchObject({ view: 'office', citySelection: null })
  })
})

describe('resetUi', () => {
  it('clears view, modal and selection (new game / load)', async () => {
    const { resetUi } = await import('../ui')
    showCity(); selectLot('villa'); openModal({ kind: 'metrics' })
    resetUi()
    expect(uiStore.getState()).toMatchObject({ view: 'office', modal: null, citySelection: null })
  })
})
