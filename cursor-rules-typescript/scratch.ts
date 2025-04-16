// ✅ Correct
const x = y === 1 ? 2 : 3

// ❌ Incorrect
let x = 2
if (y === 1) {
  x = 2
} else {
  x = 3
}
