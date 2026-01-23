# Fix: Android Keyboard Layout Instability (MIUI/Xiaomi)

## Problem Description
On certain Android devices (specifically Xiaomi/MIUI), the chat input component exhibited erratic behavior:
1.  **Jumping Input**: The input field would shift downwards or jump when the user started typing.
2.  **Unpredictable Resizing**: The system's automatic `adjustPan` or `adjustResize` behavior was inconsistent, often conflicting with custom keyboard avoidance logic.
3.  **Transient Events**: Typing would sometimes trigger rapid `keyboardDidHide` followed by `keyboardDidShow` events, causing layout flicker.

## Solution Overview
We implemented a robust, manual keyboard avoidance strategy that bypasses the system's unpredictable default behaviors.

### 1. Force `adjustNothing` in AndroidManifest
The most critical fix was preventing the Android system from trying to automatically scroll or resize the window. We found that the `softwareKeyboardLayoutMode` setting in `app.json` was not correctly propagating to the native build in all cases.

**File:** `android/app/src/main/AndroidManifest.xml`
```xml
<activity 
    ...
    android:windowSoftInputMode="adjustNothing" 
    ...
>
```
*Effect: The system now does absolutely nothing to the view layout when the keyboard opens.*

### 2. Manual Animated Padding
Since the system no longer handles the keyboard, we manually adjust the view's padding using Reanimated.

**File:** `app/home.tsx`
```tsx
// Animated style for the root container
const androidPaddingStyle = useAnimatedStyle(() => ({
    paddingBottom: bottomPadding.value
}));

// In JSX
<Animated.View style={[{ flex: 1 }, androidPaddingStyle]}>
    ...
</Animated.View>
```

### 3. Smart Event Listeners with Debouncing
We implemented custom logic in `Keyboard` event listeners to handle the layout smoothly and ignore noise.

**Show Logic:**
- Listen to `keyboardDidShow`.
- Set `bottomPadding.value = height + 10` (Keyboard Height + small buffer).
- This manually pushes the `ChatInput` (which is at the bottom of the container) up to sit perfectly above the keyboard.

**Hide Logic (Debounced):**
- Some keyboards send a "Hide" event momentarily when switching input modes or typing suggestions appear.
- We added a **300ms debounce** to the `keyboardDidHide` listener.
- If a new `Show` event arrives within this window (e.g., during typing), the "Hide" action is cancelled, preventing the input from dropping down and jumping back up.

## Key Takeaways for Future Devs
- **Trust Manifest over app.json**: For critical native behaviors like `windowSoftInputMode`, verifying `AndroidManifest.xml` is essential.
- **MIUI Quirks**: Xiaomi devices often handle standard Android intent flags differently; `adjustNothing` + Manual Control is the most reliable way to enforce a custom specific layout.
- **Debounce is King**: When keyboard events are noisy, debouncing the destructive action (hiding/resetting layout) provides a stable user experience.
