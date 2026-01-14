// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    interface Error {
      message: string;
      code?: string;
    }
    interface Locals {
      user: import('$types').TUser | null;
    }
    interface PageData {
      user: import('$types').TUser | null;
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
