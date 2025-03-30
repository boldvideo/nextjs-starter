/**
 * Video Player Components
 *
 * This file exports two video player implementations:
 * 1. MuxPlayer - Based on Mux's official player component
 * 2. VidstackPlayer - Based on the Vidstack player library
 *
 * You can use either player directly by importing it:
 * import { MuxPlayer } from "@/components/players";
 * import { VidstackPlayer } from "@/components/players";
 *
 * Or use the default Player export which can be switched below.
 */

// Export individual player implementations
export { MuxPlayerComponent as MuxPlayer } from "./player-mux";
export { VidstackPlayer } from "./player-vidstack";

// Default player export - change this line to switch the default player
// This is what gets used when you import { Player } from "@/components/players"
export { MuxPlayerComponent as Player } from "./player-mux";
