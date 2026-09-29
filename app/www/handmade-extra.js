// Extra hand-picked small-but-hard levels (same search technique as the
// project's gen-presets.js, generated offline) — spliced onto the main
// preset lists after presets.js loads.

window.PRESETS_GOAL = window.PRESETS_GOAL.concat([
  {
    "name": "Small Hard 1",
    "vertices": {
      "s": {
        "x": 500,
        "y": 150,
        "label": "s",
        "role": "start"
      },
      "v1": {
        "x": 735,
        "y": 263,
        "label": "1",
        "role": null
      },
      "v2": {
        "x": 792,
        "y": 517,
        "label": "2",
        "role": null
      },
      "v3": {
        "x": 630,
        "y": 720,
        "label": "3",
        "role": null
      },
      "v4": {
        "x": 370,
        "y": 720,
        "label": "4",
        "role": null
      },
      "v5": {
        "x": 208,
        "y": 517,
        "label": "5",
        "role": null
      },
      "t": {
        "x": 265,
        "y": 263,
        "label": "t",
        "role": "goal"
      }
    },
    "edges": [
      [
        "s",
        "v1",
        0
      ],
      [
        "s",
        "v5",
        1
      ],
      [
        "v1",
        "v2",
        1
      ],
      [
        "v1",
        "v3",
        0
      ],
      [
        "v1",
        "v4",
        1
      ],
      [
        "v1",
        "t",
        0
      ],
      [
        "v2",
        "v4",
        0
      ],
      [
        "v2",
        "v5",
        0
      ],
      [
        "v2",
        "t",
        1
      ],
      [
        "v3",
        "v4",
        0
      ],
      [
        "v3",
        "v5",
        1
      ],
      [
        "v4",
        "v5",
        1
      ]
    ],
    "start": "s",
    "goal": "t",
    "_optimal": 6
  },
  {
    "name": "Small Hard 2",
    "vertices": {
      "s": {
        "x": 500,
        "y": 150,
        "label": "s",
        "role": "start"
      },
      "v1": {
        "x": 735,
        "y": 263,
        "label": "1",
        "role": null
      },
      "v2": {
        "x": 792,
        "y": 517,
        "label": "2",
        "role": null
      },
      "v3": {
        "x": 630,
        "y": 720,
        "label": "3",
        "role": null
      },
      "v4": {
        "x": 370,
        "y": 720,
        "label": "4",
        "role": null
      },
      "v5": {
        "x": 208,
        "y": 517,
        "label": "5",
        "role": null
      },
      "t": {
        "x": 265,
        "y": 263,
        "label": "t",
        "role": "goal"
      }
    },
    "edges": [
      [
        "s",
        "v4",
        1
      ],
      [
        "v1",
        "v2",
        0
      ],
      [
        "v1",
        "v3",
        1
      ],
      [
        "v1",
        "v4",
        1
      ],
      [
        "v1",
        "v5",
        0
      ],
      [
        "v2",
        "t",
        0
      ],
      [
        "v3",
        "v4",
        0
      ],
      [
        "v3",
        "v5",
        0
      ],
      [
        "v3",
        "t",
        1
      ]
    ],
    "start": "s",
    "goal": "t",
    "_optimal": 6
  },
  {
    "name": "Small Hard 3",
    "vertices": {
      "s": {
        "x": 500,
        "y": 150,
        "label": "s",
        "role": "start"
      },
      "v1": {
        "x": 735,
        "y": 263,
        "label": "1",
        "role": null
      },
      "v2": {
        "x": 792,
        "y": 517,
        "label": "2",
        "role": null
      },
      "v3": {
        "x": 630,
        "y": 720,
        "label": "3",
        "role": null
      },
      "v4": {
        "x": 370,
        "y": 720,
        "label": "4",
        "role": null
      },
      "v5": {
        "x": 208,
        "y": 517,
        "label": "5",
        "role": null
      },
      "t": {
        "x": 265,
        "y": 263,
        "label": "t",
        "role": "goal"
      }
    },
    "edges": [
      [
        "s",
        "v1",
        0
      ],
      [
        "s",
        "v2",
        0
      ],
      [
        "s",
        "v3",
        1
      ],
      [
        "s",
        "t",
        0
      ],
      [
        "v1",
        "v2",
        1
      ],
      [
        "v1",
        "v4",
        1
      ],
      [
        "v1",
        "v5",
        0
      ],
      [
        "v1",
        "t",
        0
      ],
      [
        "v2",
        "v3",
        0
      ],
      [
        "v2",
        "v4",
        0
      ],
      [
        "v2",
        "t",
        1
      ],
      [
        "v3",
        "t",
        1
      ],
      [
        "v4",
        "v5",
        0
      ]
    ],
    "start": "s",
    "goal": "t",
    "_optimal": 6
  },
  {
    "name": "Small Hard 4",
    "vertices": {
      "s": {
        "x": 500,
        "y": 150,
        "label": "s",
        "role": "start"
      },
      "v1": {
        "x": 735,
        "y": 263,
        "label": "1",
        "role": null
      },
      "v2": {
        "x": 792,
        "y": 517,
        "label": "2",
        "role": null
      },
      "v3": {
        "x": 630,
        "y": 720,
        "label": "3",
        "role": null
      },
      "v4": {
        "x": 370,
        "y": 720,
        "label": "4",
        "role": null
      },
      "v5": {
        "x": 208,
        "y": 517,
        "label": "5",
        "role": null
      },
      "t": {
        "x": 265,
        "y": 263,
        "label": "t",
        "role": "goal"
      }
    },
    "edges": [
      [
        "s",
        "v2",
        0
      ],
      [
        "s",
        "v3",
        1
      ],
      [
        "s",
        "v5",
        0
      ],
      [
        "v1",
        "v2",
        1
      ],
      [
        "v1",
        "v3",
        0
      ],
      [
        "v1",
        "v4",
        1
      ],
      [
        "v1",
        "v5",
        0
      ],
      [
        "v2",
        "v4",
        0
      ],
      [
        "v2",
        "v5",
        0
      ],
      [
        "v2",
        "t",
        1
      ],
      [
        "v3",
        "t",
        1
      ],
      [
        "v4",
        "t",
        0
      ]
    ],
    "start": "s",
    "goal": "t",
    "_optimal": 6
  },
  {
    "name": "Small Hard 5",
    "vertices": {
      "s": {
        "x": 500,
        "y": 150,
        "label": "s",
        "role": "start"
      },
      "v1": {
        "x": 735,
        "y": 263,
        "label": "1",
        "role": null
      },
      "v2": {
        "x": 792,
        "y": 517,
        "label": "2",
        "role": null
      },
      "v3": {
        "x": 630,
        "y": 720,
        "label": "3",
        "role": null
      },
      "v4": {
        "x": 370,
        "y": 720,
        "label": "4",
        "role": null
      },
      "v5": {
        "x": 208,
        "y": 517,
        "label": "5",
        "role": null
      },
      "t": {
        "x": 265,
        "y": 263,
        "label": "t",
        "role": "goal"
      }
    },
    "edges": [
      [
        "s",
        "v3",
        0
      ],
      [
        "s",
        "v4",
        1
      ],
      [
        "s",
        "t",
        0
      ],
      [
        "v1",
        "v3",
        0
      ],
      [
        "v1",
        "v5",
        0
      ],
      [
        "v1",
        "t",
        1
      ],
      [
        "v2",
        "v3",
        0
      ],
      [
        "v2",
        "v5",
        1
      ],
      [
        "v2",
        "t",
        0
      ],
      [
        "v4",
        "v5",
        0
      ]
    ],
    "start": "s",
    "goal": "t",
    "_optimal": 6
  }
]);

window.PRESETS_ALL = window.PRESETS_ALL.concat([
  {
    "name": "Small Hard 1",
    "vertices": {
      "s": {
        "x": 500,
        "y": 150,
        "label": "s",
        "role": "start"
      },
      "v1": {
        "x": 760,
        "y": 300,
        "label": "1",
        "role": null
      },
      "v2": {
        "x": 760,
        "y": 600,
        "label": "2",
        "role": null
      },
      "v3": {
        "x": 500,
        "y": 750,
        "label": "3",
        "role": null
      },
      "v4": {
        "x": 240,
        "y": 600,
        "label": "4",
        "role": null
      },
      "v5": {
        "x": 240,
        "y": 300,
        "label": "5",
        "role": null
      }
    },
    "edges": [
      [
        "s",
        "v1",
        1
      ],
      [
        "s",
        "v4",
        1
      ],
      [
        "s",
        "v5",
        0
      ],
      [
        "v1",
        "v2",
        0
      ],
      [
        "v1",
        "v3",
        0
      ],
      [
        "v1",
        "v4",
        1
      ],
      [
        "v1",
        "v5",
        0
      ],
      [
        "v2",
        "v3",
        1
      ],
      [
        "v2",
        "v4",
        1
      ],
      [
        "v2",
        "v5",
        0
      ],
      [
        "v3",
        "v4",
        0
      ],
      [
        "v3",
        "v5",
        1
      ],
      [
        "v4",
        "v5",
        1
      ]
    ],
    "start": "s",
    "goal": null,
    "_optimal": 5
  },
  {
    "name": "Small Hard 2",
    "vertices": {
      "s": {
        "x": 500,
        "y": 150,
        "label": "s",
        "role": "start"
      },
      "v1": {
        "x": 760,
        "y": 300,
        "label": "1",
        "role": null
      },
      "v2": {
        "x": 760,
        "y": 600,
        "label": "2",
        "role": null
      },
      "v3": {
        "x": 500,
        "y": 750,
        "label": "3",
        "role": null
      },
      "v4": {
        "x": 240,
        "y": 600,
        "label": "4",
        "role": null
      },
      "v5": {
        "x": 240,
        "y": 300,
        "label": "5",
        "role": null
      }
    },
    "edges": [
      [
        "s",
        "v2",
        1
      ],
      [
        "s",
        "v4",
        1
      ],
      [
        "s",
        "v5",
        0
      ],
      [
        "v1",
        "v3",
        0
      ],
      [
        "v1",
        "v5",
        1
      ],
      [
        "v2",
        "v3",
        1
      ],
      [
        "v2",
        "v4",
        0
      ],
      [
        "v3",
        "v5",
        0
      ],
      [
        "v4",
        "v5",
        0
      ]
    ],
    "start": "s",
    "goal": null,
    "_optimal": 5
  },
  {
    "name": "Small Hard 3",
    "vertices": {
      "s": {
        "x": 500,
        "y": 150,
        "label": "s",
        "role": "start"
      },
      "v1": {
        "x": 760,
        "y": 300,
        "label": "1",
        "role": null
      },
      "v2": {
        "x": 760,
        "y": 600,
        "label": "2",
        "role": null
      },
      "v3": {
        "x": 500,
        "y": 750,
        "label": "3",
        "role": null
      },
      "v4": {
        "x": 240,
        "y": 600,
        "label": "4",
        "role": null
      },
      "v5": {
        "x": 240,
        "y": 300,
        "label": "5",
        "role": null
      }
    },
    "edges": [
      [
        "s",
        "v2",
        1
      ],
      [
        "s",
        "v3",
        0
      ],
      [
        "s",
        "v4",
        0
      ],
      [
        "s",
        "v5",
        1
      ],
      [
        "v1",
        "v3",
        1
      ],
      [
        "v1",
        "v4",
        0
      ],
      [
        "v2",
        "v4",
        1
      ],
      [
        "v2",
        "v5",
        0
      ],
      [
        "v3",
        "v4",
        0
      ],
      [
        "v3",
        "v5",
        0
      ],
      [
        "v4",
        "v5",
        1
      ]
    ],
    "start": "s",
    "goal": null,
    "_optimal": 5
  },
  {
    "name": "Small Hard 4",
    "vertices": {
      "s": {
        "x": 500,
        "y": 150,
        "label": "s",
        "role": "start"
      },
      "v1": {
        "x": 760,
        "y": 300,
        "label": "1",
        "role": null
      },
      "v2": {
        "x": 760,
        "y": 600,
        "label": "2",
        "role": null
      },
      "v3": {
        "x": 500,
        "y": 750,
        "label": "3",
        "role": null
      },
      "v4": {
        "x": 240,
        "y": 600,
        "label": "4",
        "role": null
      },
      "v5": {
        "x": 240,
        "y": 300,
        "label": "5",
        "role": null
      }
    },
    "edges": [
      [
        "s",
        "v2",
        1
      ],
      [
        "s",
        "v3",
        0
      ],
      [
        "s",
        "v4",
        0
      ],
      [
        "s",
        "v5",
        1
      ],
      [
        "v1",
        "v2",
        1
      ],
      [
        "v1",
        "v4",
        0
      ],
      [
        "v1",
        "v5",
        1
      ],
      [
        "v2",
        "v5",
        0
      ],
      [
        "v3",
        "v4",
        0
      ],
      [
        "v3",
        "v5",
        0
      ]
    ],
    "start": "s",
    "goal": null,
    "_optimal": 5
  }
]);
