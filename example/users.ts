import { Domain } from "../src";

export interface UserState {
  readonly created: boolean;
}

export interface UserCommands {
  readonly register: {
    readonly email: string;
  };
}

export interface UserEvents {
  readonly registered: {
    readonly email: string;
  };
}

export const Users = new Domain<UserState, UserCommands, UserEvents>({
  defaultState: {
    created: false,
  },
  commands: {
    register: ({ state, events, command }) => {
      if (state.created) {
        throw new Error("This user is already registered.");
      }

      return [events.registered(command)];
    },
  },
  events: {
    registered: () => ({
      created: true,
    }),
  },
});
