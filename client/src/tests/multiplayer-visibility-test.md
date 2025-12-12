# Test Plan: Multiplayer Visibility

This document outlines the test plan for verifying that remote players are correctly rendered in the game world.

## Objective

To ensure that when multiple players are in the same room, each player can see the avatars of all other players.

## Test Setup

1.  **Mock WorldSocketService**: Create a mock version of the `WorldSocketService` to simulate server events. This mock will have methods to manually trigger `onPlayerJoined`, `onWorldState`, `onPlayerMoved`, and `onPlayerLeft` events.
2.  **Test GameScene**: Instantiate the `GameScene` with the mock `WorldSocketService` and a test player ID.
3.  **Spy on RemotePlayerManager**: Use a testing spy (e.g., from Jest or Sinon) to monitor calls to the `addPlayer` method of the `RemotePlayerManager`.

## Test Cases

### Test Case 1: A remote player joins the room

1.  **Trigger**: Simulate a `onPlayerJoined` event on the mock `WorldSocketService` with data for a new remote player.
2.  **Verification**:
    *   Assert that the `addPlayer` method of the `RemotePlayerManager` was called exactly once.
    *   Assert that the `addPlayer` method was called with the correct player data.
    *   Assert that the number of remote players in the `RemotePlayerManager` is 1.

### Test Case 2: The local player does not render themselves as a remote player

1.  **Trigger**: Simulate a `onPlayerJoined` event on the mock `WorldSocketService` with data for the *local* player (i.e., the player ID matches the one used to initialize the `GameScene`).
2.  **Verification**:
    *   Assert that the `addPlayer` method of the `RemotePlayerManager` was *not* called.
    *   Assert that the number of remote players in the `RemotePlayerManager` is 0.

### Test Case 3: Initial world state with multiple players

1.  **Trigger**: Simulate a `onWorldState` event on the mock `WorldSocketService` with a list of players that includes one remote player and the local player.
2.  **Verification**:
    *   Assert that the `handleWorldState` method of the `RemotePlayerManager` was called.
    *   Assert that the `addPlayer` method of the `RemotePlayerManager` was called exactly once (for the remote player).
    *   Assert that the number of remote players in the `RemotePlayerManager` is 1.

### Test Case 4: A remote player leaves

1.  **Setup**: First, add a remote player using the `onPlayerJoined` event.
2.  **Trigger**: Simulate a `onPlayerLeft` event on the mock `WorldSocketService` with the ID of the remote player.
3.  **Verification**:
    *   Assert that the `removePlayer` method of the `RemotePlayerManager` was called with the correct player ID.
    *   Assert that the number of remote players in the `RemotePlayerManager` is 0.

## Implementation

This test can be implemented using Jest and React Testing Library, similar to the existing `App.test.tsx`. The key will be to effectively mock the `WorldSocketService` and spy on the `RemotePlayerManager`.
