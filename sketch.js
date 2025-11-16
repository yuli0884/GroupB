// --- Global Variables for Scaling and Animation ---
let strokeOption;
let baseSize;
let scale;
let canvas = 800; // Basic canvas size used for scaling reference
let bgColor = [247, 241, 219]; // Light beige background color

let stripes = []; // Array to store all line stripe objects
let currentStripe = 0; // Index of the current stripe being animated
let layer2Drawn = false; // Flag to track if the main hidden line (Layer 2) has been inserted
const numGroups = 80; // Total number of line groups
const firstLayerGroups = Math.floor(numGroups * 0.7); // 70% for Layer 1

let mainHiddenLineStripe; // Stores the main hidden line stripe (Layer 2)

// --- Helper Functions ---

// Adjust stroke weights and scale based on current window size
function adjustStrokeAndScale() {
  baseSize = (windowWidth + windowHeight) / 2;
  scale = baseSize / canvas;
  strokeOption = [0.4, 0.8, 1, 2, 3.5];
  for (let i = 0; i < strokeOption.length; i++) {
    strokeOption[i] *= scale;
  }
}

// Function to generate and return all data for a single LineStripe instance
function createLineGroups() {
  let linesData = [];

  // Line color: 60% chance of black, 40% chance of background color (for erasure effect)
  const lineColor = random() < 0.6 ? color(0) : color(bgColor);

  // Randomly select the startpoint (origin is at the canvas center)
  const x1 = random(-width / 2, width / 2);
  const y1 = random(-height / 2, height / 2);

  const signX = random() > 0.5 ? 1 : -1;
  const signY = random() > 0.5 ? 1 : -1;
  const isTilted = random() < 0.5; // Tilted (30-degree) or axial (horizontal/vertical)
  const lineLength = random(80, 200) * scale; // Scaled length

  let hShift, vShift;

  if (isTilted) {
    const angle = tan(30); // angleMode(DEGREES) will handle this
    hShift = lineLength * signX;
    vShift = lineLength * angle * signY;
  } else {
    if (random() < 0.5) {
      // Horizontal
      hShift = lineLength * signX;
      vShift = 0;
    } else {
      // Vertical
      hShift = 0;
      vShift = lineLength * signY;
    }
  }

  const x2Base = x1 + hShift;
  const y2Base = y1 + vShift;
  const numLines = floor(random(10, 30));

  // Scale spacing to keep density consistent
  const spacing = random(3, 8) * scale;
  const absH = abs(hShift);
  const absV = abs(vShift);

  // Collect data for each parallel line in the group
  for (let i = 0; i < numLines; i++) {
    const offset = i * spacing;

    let X1 = x1;
    let Y1 = y1;
    let X2 = x2Base;
    let Y2 = y2Base;

    // Apply perpendicular offset
    if (absH > absV) {
      Y1 += offset;
      Y2 += offset;
    } else {
      X1 += offset;
      X2 += offset;
    }

    // Store the start/end points and properties for animation
    linesData.push({
      x1: X1,
      y1: Y1,
      x2: X2,
      y2: Y2,
      weight: random(strokeOption), // variable stroke, but scaled
      color: lineColor,
      length: lineLength // Base length for animation control
    });
  }

  // Pass the array of lines directly into LineStripe
  return new LineStripe(linesData);
}

// Function to generate and return data for the single Main Hidden Line (Layer 2)
function createMainHiddenLine() {
  let linesData = [];

  // Random angle between -45 and 45 degrees
  const baseAngle = random(-45, 45);

  // Define endpoints so the line passes across the entire canvas
  const y1 = -height / 2;
  const y2 = height / 2;

  // Horizontal shift so that the line covers the canvas width
  const shift = height * tan(baseAngle);
  const x1 = -shift;
  const x2 = shift;

  // Use background color for "erasing" effect
  const lineColor = color(bgColor);

  // Very thick stroke to strongly cut through other lines
  const weight = random(90, 150) * scale;

  // Length used for animation progress
  const lineLength = dist(x1, y1, x2, y2);

  linesData.push({
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2,
    weight: weight,
    color: lineColor,
    length: lineLength
  });

  return new LineStripe(linesData);
}

// --- LineStripe Class for Animation ---
class LineStripe {
  constructor(lines) {
    // lines: array of {x1, y1, x2, y2, weight, color, length}
    this.lines = lines;
    this.done = false;
    this.currentLen = 0;
    this.maxLen = lines[0].length; // all lines share the same base length
    this.drawSpeed = 15; // animation speed
  }

  displayStep() {
    push();
    noFill(); // Lines only

    for (let l of this.lines) {
      stroke(l.color);
      strokeWeight(l.weight);

      // Calculate the segment ratio for this frame
      const ratio = this.currentLen / this.maxLen;

      // Current endpoint based on the ratio
      const p2X = l.x1 + (l.x2 - l.x1) * ratio;
      const p2Y = l.y1 + (l.y2 - l.y1) * ratio;

      // Draw the growing line segment
      line(l.x1, l.y1, p2X, p2Y);
    }

    // Animate growth
    if (this.currentLen < this.maxLen) {
      this.currentLen += this.drawSpeed;
      if (this.currentLen >= this.maxLen) {
        this.currentLen = this.maxLen;
        this.done = true;
      }
    } else {
      this.done = true;
    }

    pop();
  }
}

// --- p5.js Core Functions ---
function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  adjustStrokeAndScale();
  background(bgColor);

  // 1. Generate all small stripe groups (Layer 1 & 3)
  stripes = [];
  for (let g = 0; g < numGroups; g++) {
    stripes.push(createLineGroups());
  }

  // 2. Generate main hidden line stripe (Layer 2)
  mainHiddenLineStripe = createMainHiddenLine();
  currentStripe = 0;
  layer2Drawn = false; // used to control insertion
  loop(); // Enable draw loop for animation
}

function draw() {
  push();
  translate(width / 2, height / 2);

  // 1. Insert Layer 2 after 70% of stripes are drawn
  if (currentStripe === firstLayerGroups && !layer2Drawn) {
    stripes.splice(currentStripe, 0, mainHiddenLineStripe);
    layer2Drawn = true;
  }

  // 2. Animate current stripe
  if (currentStripe < stripes.length) {
    stripes[currentStripe].displayStep();

    if (stripes[currentStripe].done) {
      currentStripe++;
    }
  } else {
    noLoop(); // Stop when all stripes are drawn
  }

  pop();
}

// Handle window resize event
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // Recalculate scale and regenerate everything
  adjustStrokeAndScale();
  background(bgColor);
  stripes = [];
  currentStripe = 0;
  layer2Drawn = false;

  for (let g = 0; g < numGroups; g++) {
    stripes.push(createLineGroups());
  }
  mainHiddenLineStripe = createMainHiddenLine();

  loop();
}