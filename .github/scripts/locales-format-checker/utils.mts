import { info, setFailed, startGroup } from "@actions/core";
import { COLORS } from "./constants.mts";

/**
 * Prints a message to the console with a color code and automatically adds the color reset code at the end.
 * @param color - The color to apply to the message
 * @param message - The message to print
 */
export function logInfo(color: string, message: string): void {
  info(color + message + COLORS.reset);
}

/**
 * Prints a message to the console with a color code and automatically adds the color reset code at the end.
 * @remarks
 * Begins an output group.
 *
 * Output until the next `groupEnd` will be foldable in this group
 * @param color - The color to apply to the message
 * @param message - The message to print
 */
export function logStartGroup(color: string, message: string): void {
  startGroup(color + message + COLORS.reset);
}

/**
 * Sets the action status to failed. When the action exits it will be with an exit code of 1.
 * @remarks
 * Automatically prepends the red color code and appends the color reset code to the message.
 * @param message - The message to print
 */
export function failed(message: string): void {
  setFailed(COLORS.red + message + COLORS.reset);
}
