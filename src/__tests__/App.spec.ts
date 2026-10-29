import { describe, it, expect } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import App from '@/App.vue'
import { ApiError } from '@/api/http'
import { i18n } from '@/i18n'
import { useLeaguesStore } from '@/stores/leagues'
import { deferred, LEAGUES, setup } from './helpers'

const mountApp = async (overrides: Parameters<typeof setup>[0] = {}) => {
  const context = setup(overrides)
  const wrapper = mount(App, { global: { plugins: [context.pinia] }, attachTo: document.body })
  await flushPromises()
  return { ...context, wrapper }
}

type Wrapper = Awaited<ReturnType<typeof mountApp>>['wrapper']

const cardNames = (wrapper: Wrapper) =>
  wrapper.findAll('[data-testid="league-name"]').map((node) => node.text())
const sportOptions = (wrapper: Wrapper) =>
  wrapper.findAll('#league-sport option').map((option) => option.text())
const buttonNamed = (wrapper: Wrapper, name: string) =>
  wrapper.findAll('button').find((button) => button.text() === name)!
const sportSelect = (wrapper: Wrapper) => wrapper.find('#league-sport')

describe('App', () => {
  it('shows skeletons while loading, then the leagues', async () => {
    const pending = deferred<typeof LEAGUES>()
    const { wrapper } = await mountApp({ getLeagues: () => pending.promise })
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading leagues')

    pending.resolve(LEAGUES)
    await flushPromises()
    expect(wrapper.findAll('[data-league-id]')).toHaveLength(20)
    expect(wrapper.find('[role="status"]').text()).toBe('20 leagues')
    wrapper.unmount()
  })

  it('renders the three required fields on each card', async () => {
    const { wrapper } = await mountApp()
    const card = wrapper.find('[data-league-id="4328"]')
    expect(card.text()).toContain('English Premier League') // strLeague
    expect(card.text()).toContain('Soccer') // strSport
    expect(card.text()).toContain('Premier League, EPL +1 more') // strLeagueAlternate
    wrapper.unmount()
  })

  it('filters by search and sport together and reports the count', async () => {
    const { wrapper } = await mountApp()
    await wrapper.find('#league-search').setValue('british')
    expect(cardNames(wrapper)).toEqual(['British GT Championship', 'BTCC'])

    await sportSelect(wrapper).setValue('Soccer')
    expect(wrapper.text()).toContain('No leagues matching “british” in Soccer.')
    expect(wrapper.find('[role="status"]').text()).toBe('0 of 20 leagues')

    await buttonNamed(wrapper, 'Clear filters').trigger('click')
    expect(wrapper.findAll('[data-league-id]')).toHaveLength(20)
    wrapper.unmount()
  })

  it('offers a sport dropdown with counts that follow the search', async () => {
    const { wrapper } = await mountApp()
    await wrapper.find('#league-search').setValue('premier')
    expect(sportOptions(wrapper)).toEqual([
      'All sports (2)',
      'Basketball (0)',
      'Motorsport (0)',
      'Soccer (2)',
    ])
    expect((sportSelect(wrapper).element as HTMLSelectElement).value).toBe('')
    wrapper.unmount()
  })

  it('disables the sport dropdown until the leagues have loaded', async () => {
    const pending = deferred<typeof LEAGUES>()
    const { wrapper } = await mountApp({ getLeagues: () => pending.promise })
    expect(sportSelect(wrapper).attributes('disabled')).toBeDefined()

    pending.resolve(LEAGUES)
    await flushPromises()
    expect(sportSelect(wrapper).attributes('disabled')).toBeUndefined()
    expect(sportOptions(wrapper)).toHaveLength(4)
    wrapper.unmount()
  })

  it('shows the saved list with its age when a fresh one cannot be loaded', async () => {
    const saved = { value: LEAGUES, savedAt: Date.UTC(2026, 9, 28, 9, 5) }
    const { client, wrapper } = await mountApp({
      getLeagues: async () => {
        throw new ApiError('network', 'offline')
      },
      peekStaleLeagues: () => saved,
    })
    expect(wrapper.findAll('[data-league-id]')).toHaveLength(20)
    const notice = wrapper.find('[data-testid="stale-notice"]')
    expect(notice.text()).toContain('Could not reach TheSportsDB. Check your connection.')
    expect(notice.text()).toContain('Showing the list saved on Oct 28, 2026')

    client.getLeagues.mockResolvedValueOnce(LEAGUES)
    await notice.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="stale-notice"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('highlights the matched text', async () => {
    const { wrapper } = await mountApp()
    await wrapper.find('#league-search').setValue('bund')
    expect(wrapper.findAll('mark').map((m) => m.text())).toEqual(['Bund'])
    wrapper.unmount()
  })

  it('shows an error with a working retry', async () => {
    const { wrapper, client } = await mountApp({
      getLeagues: async () => {
        throw new ApiError('network', 'fetch failed')
      },
    })
    expect(wrapper.find('[role="alert"]').text()).toContain('Could not reach TheSportsDB.')

    client.getLeagues.mockResolvedValueOnce(LEAGUES)
    await wrapper.find('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-league-id]')).toHaveLength(20)
    wrapper.unmount()
  })

  it('opens the badge dialog on click and closes it again', async () => {
    const { wrapper, client } = await mountApp()
    await wrapper.find('[data-league-id="4328"]').trigger('click')
    await flushPromises()

    const dialog = wrapper.find('dialog')
    expect(dialog.attributes('open')).toBeDefined()
    expect(dialog.find('#dialog-title').text()).toBe('English Premier League')
    expect(client.getSeasons).toHaveBeenCalledWith('4328')
    const img = dialog.find('img')
    expect(img.attributes('src')).toMatch(/\/small$/)
    expect(img.attributes('alt')).toBe('English Premier League badge, 1996–97 season')

    await dialog.find('[aria-label="Close"]').trigger('click')
    expect(dialog.attributes('open')).toBeUndefined()
    expect(useLeaguesStore().selectedId).toBeNull()
    wrapper.unmount()
  })

  it('lists badge seasons newest first and lets the user pick another', async () => {
    const { wrapper } = await mountApp()
    await wrapper.find('[data-league-id="4328"]').trigger('click')
    await flushPromises()

    const seasons = wrapper.findAll('input[name="season"]')
    expect(seasons.map((radio) => radio.attributes('value'))).toEqual([
      '1996-1997',
      '1995-1996',
      '1994-1995',
      '1993-1994',
      '1992-1993',
    ])
    expect((seasons[0]!.element as HTMLInputElement).checked).toBe(true)

    await wrapper.find('input[name="season"][value="1992-1993"]').setValue()
    expect(wrapper.find('dialog img').attributes('alt')).toContain('1992–93')
    expect(wrapper.find('[data-testid="season"]').text()).toBe('1992–93')
    wrapper.unmount()
  })

  it('explains when a league has no badge', async () => {
    const { wrapper } = await mountApp({
      getSeasons: async () => [{ season: '1892-1893', badgeUrl: null }],
    })
    await wrapper.find('[data-league-id="4329"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('dialog').text()).toContain('No badge on file')
    wrapper.unmount()
  })

  it('restores filters and the open league from the URL, and writes changes back', async () => {
    window.history.replaceState(null, '', '/?q=epl&sport=Soccer&league=4328')
    const { wrapper } = await mountApp()
    expect(cardNames(wrapper)).toEqual(['English Premier League'])
    expect(wrapper.find('dialog').attributes('open')).toBeDefined()

    await wrapper.find('#league-search').setValue('serie')
    await flushPromises()
    expect(window.location.search).toBe('?q=serie&sport=Soccer&league=4328')
    wrapper.unmount()
  })

  it('focuses the search box with "/"', async () => {
    const { wrapper } = await mountApp()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
    expect(document.activeElement?.id).toBe('league-search')
    wrapper.unmount()
  })

  it('switches language from the hero and remembers the choice', async () => {
    const { wrapper } = await mountApp()
    await wrapper.find('#locale-select').setValue('es')

    // Rendered whitespace collapses, as it does for the screen and the accessible name.
    expect(wrapper.find('h1').text().replace(/\s+/g, ' ')).toBe('Encuentra tu liga.')
    expect(wrapper.find('[role="status"]').text()).toBe('20 ligas')
    expect(wrapper.find('[data-league-id="4328"]').text()).toContain('Fútbol')
    expect(sportOptions(wrapper)[0]).toBe('Todos los deportes (20)')
    expect(document.documentElement.lang).toBe('es')
    expect(document.title).toBe('Ligas deportivas')
    expect(localStorage.getItem('locale')).toBe('es')

    await wrapper.find('#league-search').setValue('british')
    await sportSelect(wrapper).setValue('Soccer')
    expect(wrapper.find('#results-heading').text()).toBe('Ligas de Fútbol')
    expect(wrapper.text()).toContain('Ninguna liga de Fútbol coincide con «british».')
    wrapper.unmount()
  })

  it('translates API errors', async () => {
    i18n.global.locale.value = 'es'
    const { wrapper } = await mountApp({
      getLeagues: async () => {
        throw new ApiError('http', 'HTTP 503', 503)
      },
    })
    expect(wrapper.find('[role="alert"]').text()).toContain('TheSportsDB respondió con HTTP 503.')
    expect(wrapper.find('[role="alert"] button').text()).toBe('Reintentar')
    wrapper.unmount()
  })
})
