/**
 * Video Player Components
 *
 * This file exports the MuxPlayer implementation based on Mux's official player component.
 *
 * You can use the player by importing it:
 * import { MuxPlayer } from "@/components/players";
 * import { Player } from "@/components/players"; // Default export
 */

// Export player implementations
export { MuxPlayerComponent as MuxPlayer } from "./player-mux";
export { YouTubePlayerComponent as YouTubePlayer } from "./player-youtube";

// Default player: Mux for native playback, a real YouTube embed when the
// video's playback_mode is flipped to play from source.
export { SmartPlayer as Player } from "./player-smart";
