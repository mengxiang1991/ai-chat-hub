import type { BrowserView } from 'electron';

export interface PlatformAdapter {
  id: string;
  name: string;
  icon: string;
  url: string;
  loginUrl: string;
  isLoggedIn(view: BrowserView): Promise<boolean>;
  login(view: BrowserView): Promise<void>;
  ask(view: BrowserView, question: string): Promise<string>;
  logout(view: BrowserView): Promise<void>;
}

export type PlatformConstructor = new () => PlatformAdapter;
