# Real-Time Dashboard Animations Guide

## Overview
Comprehensive CSS animations providing instant visual feedback for all WebSocket events.

## Animation Categories

### 1. Trade Flash Animations
**Full-screen overlay flashes on BUY/SELL trades**

#### Classes:
- `.trade-flash-buy` - Green flash for BUY trades
- `.trade-flash-sell` - Red flash for SELL trades

#### Properties:
- **Duration:** 0.5 seconds
- **Opacity:** 30% at peak
- **Position:** Fixed, full viewport
- **Z-index:** 9998 (below toasts)
- **Animation:** Fade in → peak → fade out

#### Usage in JavaScript:
```javascript
flashDiv.className = 'trade-flash-buy';  // Green flash
flashDiv.className = 'trade-flash-sell'; // Red flash
```

### 2. Price Change Indicators
**Animated arrows showing price direction**

#### Classes:
- `.price-up` - Green ↑ with pulse
- `.price-down` - Red ↓ with pulse
- `.price-unchanged` - Gray → no animation

#### Animation:
- **Pulse:** 1 second infinite
- **Scale:** 1.0 → 1.1 → 1.0
- **Opacity:** 1.0 → 0.7 → 1.0

#### Visual:
```
Price Up:   $45,000 ↑  (green, pulsing)
Price Down: $44,500 ↓  (red, pulsing)
Unchanged:  $45,000 →  (gray, static)
```

### 3. Toast Notifications
**Modern card-style notifications with slide animation**

#### Structure:
```html
<div class="toast toast-{type}">
  <div class="toast-header">
    <div class="toast-title">🔔 Title</div>
    <button class="toast-close">×</button>
  </div>
  <div class="toast-body">Message text</div>
  <div class="toast-progress"></div>
</div>
```

#### Types & Colors:
- **trade** - Blue border (`#3b82f6`)
- **success** - Green border (`#22c55e`)
- **error** - Red border (`#ef4444`)
- **warning** - Yellow border (`#eab308`)
- **info** - Cyan border (`#06b6d4`)

#### Animations:
1. **Slide in:** From right (400px) over 0.3s
2. **Progress bar:** Shrinks from 100% → 0% over duration
3. **Hover:** Shifts left 5px with deeper shadow
4. **Click:** Slide out to right over 0.3s

#### Auto-Dismiss:
- Default: 5 seconds
- Error: 10 seconds
- Warning: 7 seconds
- Custom: Configurable per notification

### 4. Connection Status Badge
**Top-right indicator with pulsing animation**

#### States:
```css
.connected      → 🟢 Live (green, pulsing)
.reconnecting   → 🟡 Reconnecting... (yellow, fast pulse)
.disconnected   → 🔴 Disconnected (red, no pulse)
```

#### Pulse Animation:
- **Connected:** Slow pulse (2s), gentle glow
- **Reconnecting:** Fast pulse (1s), fading effect
- **Disconnected:** Static, no animation

#### Position:
- Fixed top-right (20px from edges)
- Z-index: 9997
- Border-radius: 20px (pill shape)

### 5. Element Flash Effects
**Quick background flash for value updates**

#### Classes:
- `.flash-green` - Green background flash (0.8s)
- `.flash-red` - Red background flash (0.8s)

#### Usage:
```javascript
element.classList.add('flash-green');
// Automatically removes after animation
```

#### Animation:
```
0%   → transparent
50%  → rgba(green/red, 0.3)
100% → transparent
```

### 6. Status Change Animations
**Smooth transitions for bot status updates**

#### Classes:
- `.status-transition` - Smooth 0.5s transition
- `.status-changed` - Pulse effect on change

#### Pulse Animation:
```
0%   → scale(1), no shadow
50%  → scale(1.05), large shadow
100% → scale(1), no shadow
```

#### Badge Colors:
- `.badge-success` - Green (#22c55e) - Running
- `.badge-secondary` - Gray (#6b7280) - Stopped
- `.badge-info` - Blue (#3b82f6)
- `.badge-warning` - Yellow (#eab308)
- `.badge-danger` - Red (#ef4444)

### 7. Trade Table Row Highlight
**New trade rows highlight briefly**

#### Class: `.trade-row-new`

#### Animation:
```
0%   → Blue background (rgba(59, 130, 246, 0.3))
100% → Transparent (2 seconds)
```

#### Auto-removal:
JavaScript removes class after 2 seconds

### 8. Counter Animations
**Numeric values scale up when changed**

#### Classes:
- `.counter-up` - Scale up with green flash
- `.counter-down` - Scale up with red flash

#### Animation (0.5s):
```
0%   → scale(1), original color
50%  → scale(1.2), green/red color
100% → scale(1), original color
```

### 9. Loading Skeleton
**Shimmer effect for loading states**

#### Class: `.skeleton`

#### Animation:
```
Gradient shimmer moving left-to-right
Duration: 1.5s infinite
```

#### Usage:
```html
<div class="skeleton" style="width: 100px; height: 20px;"></div>
```

### 10. Utility Animations

#### Fade In/Out:
- `.fade-in` - 0.3s fade in
- `.fade-out` - 0.3s fade out

#### Spin:
- `.spin` - 1s infinite rotation
- Perfect for loading spinners

## Responsive Design

### Mobile Adjustments (< 768px):
- Toast notifications: Full width with 10px margins
- Connection status: Smaller font (0.75rem)
- All animations maintain smoothness

## Dark Mode Support

### Auto-detection:
```css
@media (prefers-color-scheme: dark) {
  /* Dark backgrounds for toasts */
  /* Adjusted text colors */
}
```

## Performance Optimization

### Hardware Acceleration:
All animations use `transform` and `opacity` for GPU acceleration

### No Layout Thrashing:
- Fixed positioning for overlays
- No layout changes during animations

### Smooth 60fps:
- All durations optimized (< 1s)
- Use of `ease-in-out` timing

## CSS File Organization

```
style.css structure:
├── Trade Flash Animations
├── Price Change Indicators  
├── Status Change Animations
├── Toast Notifications
├── Connection Status Indicator
├── Trade History Table
├── Loading & Skeleton States
├── Counter Animations
├── Utility Classes
├── Responsive Adjustments
└── Dark Mode Support
```

## Browser Compatibility

### Supported:
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+

### Features Used:
- CSS Grid/Flexbox
- CSS Animations (@keyframes)
- CSS Variables (optional)
- Fixed positioning
- Transform/Opacity

## Testing Checklist

### Trade Flash:
- [ ] BUY trade → Green full-screen flash
- [ ] SELL trade → Red full-screen flash
- [ ] Flash fades smoothly in 0.5s

### Toast Notifications:
- [ ] Slides in from right
- [ ] Progress bar animates
- [ ] Click dismisses immediately
- [ ] Auto-dismisses after duration
- [ ] Multiple toasts stack properly

### Price Indicators:
- [ ] Up arrow pulses green
- [ ] Down arrow pulses red
- [ ] Unchanged shows gray arrow

### Connection Status:
- [ ] Green badge pulses when connected
- [ ] Yellow badge flashes when reconnecting
- [ ] Red badge static when disconnected

### Trade Table:
- [ ] New rows highlight blue
- [ ] Highlight fades after 2s

### Element Flashes:
- [ ] Price flash green on increase
- [ ] Price flash red on decrease

## Integration Example

```javascript
// Trade executed
flashScreen('green'); // Full screen flash
showNotification('Trade Executed', 'BUY at $45,000', 'trade', 10000);
prependTradeToTable(tradeData); // Row highlight animation

// Price update
element.classList.add('flash-green'); // Element flash
priceIndicator.className = 'price-up'; // Pulsing arrow

// Status change
statusBadge.classList.add('status-changed'); // Pulse effect
connectionStatus.className = 'connection-status connected'; // Pulsing badge
```

## Customization

### Adjust Animation Speed:
```css
/* Make flashes faster */
.trade-flash-buy,
.trade-flash-sell {
  animation-duration: 0.3s; /* Default: 0.5s */
}
```

### Change Toast Duration:
```javascript
showNotification('Title', 'Message', 'success', 8000); // 8 seconds
```

### Disable Specific Animations:
```css
/* Remove pulse from price indicators */
.price-up,
.price-down {
  animation: none;
}
```

---

**Result:** Polished, professional dashboard with instant visual feedback for every action! 🎨✨
