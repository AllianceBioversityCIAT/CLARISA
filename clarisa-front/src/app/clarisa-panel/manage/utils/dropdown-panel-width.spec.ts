import { matchDropdownPanelToTrigger } from './dropdown-panel-width';

describe('matchDropdownPanelToTrigger', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function appendPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'admin-dropdown-panel p-dropdown-panel';
    document.body.appendChild(panel);
    return panel;
  }

  function appendDropdown(width = 180): HTMLElement {
    const dropdown = document.createElement('div');
    dropdown.className = 'p-dropdown';
    Object.defineProperty(dropdown, 'getBoundingClientRect', {
      value: () => ({ width }),
    });
    document.body.appendChild(dropdown);
    return dropdown;
  }

  it('does nothing when no dropdown panel is in the DOM', () => {
    expect(() => {
      matchDropdownPanelToTrigger();
      jest.runAllTimers();
    }).not.toThrow();
  });

  it('does nothing when a panel exists but no trigger can be resolved', () => {
    const panel = appendPanel();

    matchDropdownPanelToTrigger();
    jest.runAllTimers();

    expect(panel.style.width).toBe('');
  });

  it('sizes the latest panel from the event trigger', () => {
    const panel = appendPanel();
    const dropdown = appendDropdown(220);
    const target = document.createElement('span');
    dropdown.appendChild(target);

    matchDropdownPanelToTrigger({
      originalEvent: { target } as unknown as Event,
    });
    jest.runAllTimers();

    expect(panel.style.width).toBe('220px');
    expect(panel.style.minWidth).toBe('220px');
    expect(panel.style.maxWidth).toBe('220px');
  });

  it('falls back to the active element when the event has no target', () => {
    const panel = appendPanel();
    const dropdown = appendDropdown(150);
    const focusable = document.createElement('input');
    dropdown.appendChild(focusable);
    focusable.focus();

    matchDropdownPanelToTrigger();
    jest.runAllTimers();

    expect(panel.style.width).toBe('150px');
  });

  it('falls back to an open dropdown when no event target or active element match', () => {
    const panel = appendPanel();
    appendDropdown(96);
    const openDropdown = appendDropdown(240);
    openDropdown.classList.add('p-dropdown-open');

    matchDropdownPanelToTrigger();
    jest.runAllTimers();

    expect(panel.style.width).toBe('240px');
  });
});
