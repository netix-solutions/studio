'use client';

import { FirestorePermissionError } from './errors';

// This type defines the structure of our event map.
// It maps event names to the type of data they will carry.
type EventMap = {
  'permission-error': FirestorePermissionError;
};

// A simple, typed event emitter class.
class TypedEventEmitter<T extends Record<string, any>> {
  private listeners: { [K in keyof T]?: ((data: T[K]) => void)[] } = {};

  // Method to subscribe to an event.
  on<K extends keyof T>(eventName: K, listener: (data: T[K]) => void): void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName]!.push(listener);
  }

  // Method to unsubscribe from an event.
  off<K extends keyof T>(eventName: K, listener: (data: T[K]) => void): void {
    if (!this.listeners[eventName]) {
      return;
    }
    this.listeners[eventName] = this.listeners[eventName]!.filter(
      (l) => l !== listener
    );
  }

  // Method to dispatch an event.
  emit<K extends keyof T>(eventName: K, data: T[K]): void {
    if (!this.listeners[eventName]) {
      return;
    }
    this.listeners[eventName]!.forEach((listener) => listener(data));
  }
}

// Export a singleton instance of the emitter for global use.
export const errorEmitter = new TypedEventEmitter<EventMap>();
