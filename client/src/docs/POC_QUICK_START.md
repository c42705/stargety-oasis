# Konva Map Editor POC - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Access the POC
1. Make sure the dev server is running: `npm start` (in `client/` directory)
2. Navigate to: **`http://localhost:3000/map-editor-poc`**
3. Login with admin credentials

### Step 2: Test the Features
Try each feature to verify everything works:

#### ✅ Zoom
- Click **"Zoom In"** and **"Zoom Out"** buttons
- Scroll **mouse wheel** over the canvas
- Notice zoom centers on your cursor position

#### ✅ Pan
- Hold **middle mouse button** and drag
- Or click **"Pan"** tool and left-click drag

#### ✅ Grid
- Toggle the **"Grid"** switch in the toolbar
- Grid should appear/disappear

#### ✅ Draw Rectangles
- Click **"Rectangle"** button
- Click and drag on the canvas
- See green dashed preview while dragging
- Release to create a green rectangle

### Step 3: Verify It Works
- [ ] Zoom in/out works smoothly
- [ ] Mouse wheel zoom centers on cursor
- [ ] Pan moves the canvas
- [ ] Grid toggles on/off
- [ ] Can draw multiple rectangles
- [ ] Rectangles scale with zoom
- [ ] No console errors
- [ ] Debug overlay shows correct info

---

## 🎮 Controls Reference

| Action | Control |
|--------|---------|
| **Zoom In** | Click button or scroll wheel up |
| **Zoom Out** | Click button or scroll wheel down |
| **Pan** | Middle mouse drag OR Pan tool + left drag |
| **Draw Rectangle** | Rectangle tool + click-drag |
| **Toggle Grid** | Grid switch in toolbar |
| **Reset Zoom** | Reset button (returns to 100%) |

---

## 📊 What You Should See

### Initial View
- Canvas with light gray background
- Grid lines (if enabled)
- Toolbar at top with tools and zoom controls
- Sidebar on right with status and instructions
- Debug overlay in top-right corner

### After Drawing Rectangles
- Green rectangles on the canvas
- Rectangles scale when you zoom
- Rectangles move when you pan
- Debug overlay shows shape count

### Debug Overlay Shows
- Current tool (select, draw-rect, pan)
- Zoom level (percentage)
- Pan position (x, y)
- Number of shapes
- Number of selected shapes (0 for now)

---

## ✅ Week 1 Features Checklist

All of these should work:

- [x] **Zoom In/Out** - Buttons work
- [x] **Mouse Wheel Zoom** - Zooms to cursor
- [x] **Zoom Limits** - Can't zoom beyond 0.1x or 4.0x
- [x] **Middle Mouse Pan** - Drag to move canvas
- [x] **Pan Tool** - Select tool and drag
- [x] **Grid Rendering** - Lines visible at all zoom levels
- [x] **Grid Toggle** - Switch turns grid on/off
- [x] **Rectangle Drawing** - Click-drag creates shapes
- [x] **Drawing Preview** - Green dashed outline while dragging
- [x] **Multiple Shapes** - Can create many rectangles
- [x] **Shape Persistence** - Shapes stay after creation
- [x] **Coordinate Transform** - Shapes scale/pan correctly
- [x] **No Errors** - Console is clean
- [x] **Responsive UI** - Smooth interactions

---

## 🐛 Troubleshooting

### POC doesn't load
- Check you're logged in as admin
- Verify URL is `/map-editor-poc` (not `/map-editor`)
- Check browser console for errors

### Can't draw rectangles
- Make sure "Rectangle" tool is selected (button highlighted)
- Try clicking and dragging (not just clicking)
- Check minimum size (must be at least 10x10 pixels)

### Zoom/Pan not working
- Try refreshing the page
- Check browser console for errors
- Verify mouse events are working (try clicking buttons)

### Grid not visible
- Check the Grid switch is ON
- Try zooming in/out
- Grid might be very faint - check opacity

---

## 📚 Next Steps

### If Everything Works ✅
Congratulations! Week 1 is complete. Next steps:
1. Read [WEEK_1_IMPLEMENTATION_COMPLETE.md](./WEEK_1_IMPLEMENTATION_COMPLETE.md)
2. Review the code in `client/src/modules/map-editor-poc/`
3. Plan Week 2 features (selection, polygon drawing)

### If Something Doesn't Work ❌
1. Check browser console for errors
2. Review [WEEK_1_IMPLEMENTATION_COMPLETE.md](./WEEK_1_IMPLEMENTATION_COMPLETE.md)
3. Check the hook implementations in `hooks/` directory
4. Report issues with specific error messages

---

## 🎯 Week 2 Preview

Coming next:
- **Selection System** - Click to select shapes
- **Polygon Drawing** - Click to add vertices
- **Polygon Editing** - Drag vertices to modify
- **Delete Shapes** - Remove selected shapes

---

## 📖 Documentation

- **[WEEK_1_IMPLEMENTATION_COMPLETE.md](./WEEK_1_IMPLEMENTATION_COMPLETE.md)** - Detailed implementation notes
- **[POC README](../modules/map-editor-poc/README.md)** - Module documentation
- **[Migration Plan](./fabricjs-to-react-konva-migration-plan.md)** - Overall strategy
- **[Implementation Guide](./konva-poc-implementation-guide.md)** - Code examples
- **[Evaluation Checklist](./konva-poc-evaluation-checklist.md)** - Success criteria

---

## 💡 Tips

1. **Test at different zoom levels** - Try 0.5x, 1x, 2x, 4x
2. **Draw many shapes** - Test with 10-20 rectangles
3. **Combine features** - Zoom, pan, then draw
4. **Watch the debug overlay** - Verify state updates
5. **Check the console** - Should be error-free

---

## 🎉 Success!

If you can:
- ✅ Zoom in and out smoothly
- ✅ Pan around the canvas
- ✅ Toggle the grid
- ✅ Draw multiple rectangles
- ✅ See shapes scale with zoom

**Then Week 1 is complete and the POC is working!** 🚀

---

**URL:** `http://localhost:3000/map-editor-poc`  
**Status:** ✅ Week 1 Complete  
**Next:** Week 2 - Selection & Polygon Drawing

---

**Last Updated:** 2025-10-28  
**Quick Start Version:** 1.0

