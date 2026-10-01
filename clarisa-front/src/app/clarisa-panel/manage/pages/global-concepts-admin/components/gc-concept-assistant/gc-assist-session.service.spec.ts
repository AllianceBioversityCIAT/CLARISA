import { assistChatKey, GcAssistSession, handOverChat } from './gc-assist-session.service';

describe('GcAssistSession — the chat kept per concept', () => {
  beforeEach(() => localStorage.clear());
  const key = assistChatKey('meliaf-taxonomy', 12);

  it('names one key per scheme and term, and "new" for the concept being created', () => {
    expect(key).toBe('gc-assist-chat:meliaf-taxonomy:12');
    expect(assistChatKey('MELIAF-Taxonomy', null)).toBe('gc-assist-chat:meliaf-taxonomy:new');
  });

  it('stores every message once attached, and loads it back in a new session', () => {
    const one = new GcAssistSession();
    one.attach(key);
    one.messages = [{ role: 'user', content: 'Define outcome' }, { role: 'assistant', content: 'Done.' }];
    const two = new GcAssistSession();
    two.attach(key);
    expect(two.messages.map(m => m.content)).toEqual(['Define outcome', 'Done.']);
  });

  it('reset empties the session but never erases the stored chat', () => {
    const session = new GcAssistSession();
    session.attach(key);
    session.messages = [{ role: 'user', content: 'Keep me' }];
    session.reset();
    expect(session.messages).toEqual([]);
    expect(localStorage.getItem(key)).not.toBeNull();
  });

  it('Clear forgets the chat here and in storage, but not during a turn', () => {
    const session = new GcAssistSession();
    session.attach(key);
    session.messages = [{ role: 'user', content: 'x' }];
    session.sending = true;
    session.turnToken = session.token;
    session.clearChat();
    expect(session.messages).toHaveLength(1);
    session.sending = false;
    session.clearChat();
    expect(session.messages).toEqual([]);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('hands the chat of «New concept» over to the concept it became', () => {
    const fresh = new GcAssistSession();
    fresh.attach(assistChatKey('meliaf-taxonomy', null));
    fresh.messages = [{ role: 'user', content: 'Start here' }];
    handOverChat('meliaf-taxonomy', 12);
    expect(localStorage.getItem(assistChatKey('meliaf-taxonomy', null))).toBeNull();
    const editor = new GcAssistSession();
    editor.attach(key);
    expect(editor.messages[0].content).toBe('Start here');
  });

  it('ignores a corrupted stored value instead of breaking the editor', () => {
    localStorage.setItem(key, '{not json');
    const session = new GcAssistSession();
    session.attach(key);
    expect(session.messages).toEqual([]);
  });
});
