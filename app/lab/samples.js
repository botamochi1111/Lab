// Sample levels for the lab: small hard VISIT_ALL levels, fixed-edge levels and proof demos.
var IFW_SAMPLES = [
 {
  "vertices": {
   "v0": {
    "x": 120,
    "y": 77
   },
   "v11": {
    "x": 272,
    "y": 86
   },
   "v4": {
    "x": 458,
    "y": 77
   },
   "v2": {
    "x": 586,
    "y": 97
   },
   "v7": {
    "x": 162,
    "y": 269
   },
   "v1": {
    "x": 340,
    "y": 237
   },
   "v8": {
    "x": 541,
    "y": 247
   },
   "v6": {
    "x": 673,
    "y": 261
   },
   "v9": {
    "x": 114,
    "y": 396
   },
   "v3": {
    "x": 264,
    "y": 403
   },
   "v10": {
    "x": 439,
    "y": 392
   },
   "v5": {
    "x": 604,
    "y": 412
   }
  },
  "edges": [
   [
    "v0",
    "v9",
    1
   ],
   [
    "v9",
    "v3",
    0
   ],
   [
    "v3",
    "v10",
    0
   ],
   [
    "v7",
    "v10",
    0
   ],
   [
    "v11",
    "v7",
    0
   ],
   [
    "v11",
    "v1",
    0
   ],
   [
    "v1",
    "v8",
    0
   ],
   [
    "v8",
    "v5",
    0
   ],
   [
    "v6",
    "v5",
    0
   ],
   [
    "v4",
    "v6",
    0
   ],
   [
    "v4",
    "v2",
    0
   ],
   [
    "v7",
    "v9",
    0
   ],
   [
    "v1",
    "v5",
    0
   ],
   [
    "v4",
    "v10",
    0
   ],
   [
    "v10",
    "v5",
    0
   ],
   [
    "v0",
    "v7",
    1
   ],
   [
    "v4",
    "v8",
    0
   ],
   [
    "v4",
    "v1",
    0
   ],
   [
    "v11",
    "v4",
    0
   ],
   [
    "v1",
    "v10",
    0
   ],
   [
    "v7",
    "v1",
    0
   ],
   [
    "v7",
    "v3",
    0
   ],
   [
    "v2",
    "v6",
    1
   ],
   [
    "v2",
    "v8",
    1
   ]
  ],
  "start": "v0",
  "goal": null,
  "mode": "all",
  "canRevisit": false,
  "name": "Small Hard 1 (12頂点)",
  "note": "解は1本(歩ける道800通り中)。もっともらしい罠10個(気づくまで最大7手)、迷う分かれ道7/11。交差は浅い角度なしで最大4か所。飾りの辺2本。",
  "name_en": "Small Hard 1 (12 vertices)",
  "note_en": "One solution out of 800 walks. 10 plausible traps (up to 7 moves before you notice), 7/11 ambiguous steps. At most 4 crossings, none at a shallow angle. 2 decoy edges."
 },
 {
  "vertices": {
   "v2": {
    "x": 114,
    "y": 113
   },
   "v12": {
    "x": 295,
    "y": 85
   },
   "v10": {
    "x": 427,
    "y": 119
   },
   "v9": {
    "x": 600,
    "y": 102
   },
   "v3": {
    "x": 761,
    "y": 112
   },
   "v8": {
    "x": 204,
    "y": 250
   },
   "v6": {
    "x": 357,
    "y": 253
   },
   "v14": {
    "x": 543,
    "y": 273
   },
   "v11": {
    "x": 673,
    "y": 263
   },
   "v7": {
    "x": 842,
    "y": 269
   },
   "v13": {
    "x": 118,
    "y": 384
   },
   "v4": {
    "x": 255,
    "y": 379
   },
   "v5": {
    "x": 425,
    "y": 417
   },
   "v1": {
    "x": 630,
    "y": 408
   },
   "v0": {
    "x": 792,
    "y": 406
   }
  },
  "edges": [
   [
    "v2",
    "v13",
    1
   ],
   [
    "v2",
    "v12",
    0
   ],
   [
    "v12",
    "v8",
    0
   ],
   [
    "v8",
    "v4",
    0
   ],
   [
    "v4",
    "v5",
    0
   ],
   [
    "v6",
    "v5",
    0
   ],
   [
    "v6",
    "v14",
    0
   ],
   [
    "v14",
    "v11",
    0
   ],
   [
    "v10",
    "v11",
    0
   ],
   [
    "v10",
    "v9",
    0
   ],
   [
    "v9",
    "v3",
    0
   ],
   [
    "v3",
    "v7",
    0
   ],
   [
    "v7",
    "v1",
    0
   ],
   [
    "v1",
    "v0",
    0
   ],
   [
    "v10",
    "v14",
    0
   ],
   [
    "v10",
    "v8",
    0
   ],
   [
    "v12",
    "v14",
    0
   ],
   [
    "v14",
    "v5",
    0
   ],
   [
    "v6",
    "v1",
    0
   ],
   [
    "v13",
    "v4",
    1
   ],
   [
    "v5",
    "v1",
    0
   ],
   [
    "v14",
    "v1",
    0
   ],
   [
    "v2",
    "v8",
    0
   ],
   [
    "v12",
    "v10",
    0
   ],
   [
    "v11",
    "v1",
    0
   ],
   [
    "v3",
    "v11",
    0
   ],
   [
    "v8",
    "v13",
    1
   ],
   [
    "v8",
    "v5",
    0
   ],
   [
    "v3",
    "v0",
    1
   ],
   [
    "v7",
    "v0",
    1
   ],
   [
    "v9",
    "v11",
    1
   ],
   [
    "v8",
    "v6",
    1
   ]
  ],
  "start": "v13",
  "goal": null,
  "mode": "all",
  "canRevisit": false,
  "name": "Small Hard 2 (15頂点)",
  "note": "解は1本(歩ける道3807通り中)。もっともらしい罠10個(気づくまで最大11手)、迷う分かれ道6/14。交差は浅い角度なしで最大4か所。飾りの辺4本。",
  "name_en": "Small Hard 2 (15 vertices)",
  "note_en": "One solution out of 3807 walks. 10 plausible traps (up to 11 moves before you notice), 6/14 ambiguous steps. At most 4 crossings, none at a shallow angle. 4 decoy edges."
 },
 {
  "vertices": {
   "v8": {
    "x": 86,
    "y": 119
   },
   "v11": {
    "x": 263,
    "y": 77
   },
   "v0": {
    "x": 421,
    "y": 75
   },
   "v14": {
    "x": 601,
    "y": 80
   },
   "v12": {
    "x": 194,
    "y": 265
   },
   "v10": {
    "x": 379,
    "y": 273
   },
   "v13": {
    "x": 529,
    "y": 266
   },
   "v9": {
    "x": 703,
    "y": 274
   },
   "v5": {
    "x": 120,
    "y": 406
   },
   "v4": {
    "x": 251,
    "y": 378
   },
   "v7": {
    "x": 417,
    "y": 404
   },
   "v2": {
    "x": 613,
    "y": 379
   },
   "v3": {
    "x": 190,
    "y": 558
   },
   "v15": {
    "x": 330,
    "y": 546
   },
   "v6": {
    "x": 522,
    "y": 565
   },
   "v1": {
    "x": 674,
    "y": 538
   }
  },
  "edges": [
   [
    "v10",
    "v4",
    1
   ],
   [
    "v11",
    "v10",
    0
   ],
   [
    "v11",
    "v12",
    0
   ],
   [
    "v8",
    "v12",
    0
   ],
   [
    "v8",
    "v5",
    0
   ],
   [
    "v5",
    "v3",
    0
   ],
   [
    "v3",
    "v15",
    0
   ],
   [
    "v15",
    "v6",
    0
   ],
   [
    "v2",
    "v6",
    0
   ],
   [
    "v7",
    "v2",
    0
   ],
   [
    "v13",
    "v7",
    0
   ],
   [
    "v0",
    "v13",
    0
   ],
   [
    "v0",
    "v14",
    0
   ],
   [
    "v14",
    "v9",
    0
   ],
   [
    "v9",
    "v1",
    0
   ],
   [
    "v7",
    "v15",
    0
   ],
   [
    "v8",
    "v11",
    0
   ],
   [
    "v0",
    "v12",
    0
   ],
   [
    "v7",
    "v3",
    0
   ],
   [
    "v10",
    "v7",
    0
   ],
   [
    "v9",
    "v2",
    0
   ],
   [
    "v4",
    "v3",
    1
   ],
   [
    "v0",
    "v10",
    0
   ],
   [
    "v9",
    "v7",
    0
   ],
   [
    "v11",
    "v0",
    0
   ],
   [
    "v7",
    "v6",
    0
   ],
   [
    "v12",
    "v3",
    0
   ],
   [
    "v5",
    "v4",
    1
   ],
   [
    "v12",
    "v7",
    0
   ],
   [
    "v13",
    "v9",
    0
   ],
   [
    "v12",
    "v4",
    1
   ],
   [
    "v4",
    "v7",
    1
   ],
   [
    "v2",
    "v1",
    1
   ],
   [
    "v7",
    "v1",
    1
   ],
   [
    "v14",
    "v13",
    1
   ],
   [
    "v10",
    "v13",
    1
   ]
  ],
  "start": "v4",
  "goal": null,
  "mode": "all",
  "canRevisit": false,
  "name": "Small Hard 3 (16頂点)",
  "note": "解は1本(歩ける道7856通り中)。もっともらしい罠13個(気づくまで最大11手)、迷う分かれ道8/15。交差は浅い角度なしで最大4か所。飾りの辺4本。",
  "name_en": "Small Hard 3 (16 vertices)",
  "note_en": "One solution out of 7856 walks. 13 plausible traps (up to 11 moves before you notice), 8/15 ambiguous steps. At most 4 crossings, none at a shallow angle. 4 decoy edges."
 },
 {
  "vertices": {
   "v0": {
    "x": 400,
    "y": 400
   },
   "v1": {
    "x": 400,
    "y": 230
   },
   "v2": {
    "x": 547,
    "y": 315
   },
   "v3": {
    "x": 547,
    "y": 485
   },
   "v4": {
    "x": 400,
    "y": 570
   },
   "v5": {
    "x": 253,
    "y": 485
   },
   "v6": {
    "x": 253,
    "y": 315
   }
  },
  "edges": [
   [
    "v0",
    "v1",
    1
   ],
   [
    "v0",
    "v2",
    0
   ],
   [
    "v0",
    "v3",
    1
   ],
   [
    "v0",
    "v4",
    2
   ],
   [
    "v0",
    "v5",
    1
   ],
   [
    "v0",
    "v6",
    0
   ],
   [
    "v1",
    "v2",
    1
   ],
   [
    "v1",
    "v6",
    1
   ],
   [
    "v2",
    "v3",
    1
   ],
   [
    "v3",
    "v4",
    1
   ],
   [
    "v4",
    "v5",
    1
   ],
   [
    "v5",
    "v6",
    1
   ]
  ],
  "start": "v4",
  "goal": null,
  "mode": "all",
  "canRevisit": true,
  "name": "固定辺 1(六角形・7頂点)",
  "name_en": "Fixed edges 1 (hexagon, 7 vertices)",
  "note": "全部通る・再訪あり。最短18手(最短解2本)、固定辺1本。再訪なしでは解けず、固定辺を全部オフ(または全部オン)にしても解けない。初手3通り中正解1、詰み状態26%。",
  "note_en": "Visit all, revisits allowed. Shortest solution 18 moves (2 shortest), 1 fixed edges. Unsolvable without revisits, and unsolvable if the fixed edges are all turned OFF (or all ON). 1 of 3 first moves are safe; 26% of states are dead."
 },
 {
  "vertices": {
   "v0": {
    "x": 100,
    "y": 100
   },
   "v1": {
    "x": 270,
    "y": 100
   },
   "v2": {
    "x": 440,
    "y": 100
   },
   "v3": {
    "x": 100,
    "y": 270
   },
   "v4": {
    "x": 270,
    "y": 270
   },
   "v5": {
    "x": 440,
    "y": 270
   },
   "v6": {
    "x": 100,
    "y": 440
   },
   "v7": {
    "x": 270,
    "y": 440
   },
   "v8": {
    "x": 440,
    "y": 440
   }
  },
  "edges": [
   [
    "v0",
    "v1",
    0
   ],
   [
    "v0",
    "v3",
    1
   ],
   [
    "v1",
    "v2",
    2
   ],
   [
    "v1",
    "v4",
    0
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
    "v6",
    1
   ],
   [
    "v4",
    "v5",
    1
   ],
   [
    "v4",
    "v7",
    0
   ],
   [
    "v5",
    "v8",
    1
   ],
   [
    "v6",
    "v7",
    2
   ],
   [
    "v7",
    "v8",
    1
   ]
  ],
  "start": "v1",
  "goal": null,
  "mode": "all",
  "canRevisit": true,
  "name": "固定辺 2(3×3・9頂点)",
  "name_en": "Fixed edges 2 (3x3, 9 vertices)",
  "note": "全部通る・再訪あり。最短29手(最短解2本)、固定辺2本。再訪なしでは解けず、固定辺を全部オフ(または全部オン)にしても解けない。初手1通り中正解1、詰み状態11%。",
  "note_en": "Visit all, revisits allowed. Shortest solution 29 moves (2 shortest), 2 fixed edges. Unsolvable without revisits, and unsolvable if the fixed edges are all turned OFF (or all ON). 1 of 1 first moves are safe; 11% of states are dead."
 },
 {
  "name": "ハミルトン路帰着のデモ",
  "vertices": {
   "s": {
    "x": 120,
    "y": 300
   },
   "a": {
    "x": 280,
    "y": 140
   },
   "b": {
    "x": 280,
    "y": 460
   },
   "c": {
    "x": 460,
    "y": 140
   },
   "d": {
    "x": 460,
    "y": 460
   },
   "e": {
    "x": 640,
    "y": 140
   },
   "f": {
    "x": 640,
    "y": 460
   },
   "g": {
    "x": 800,
    "y": 300
   }
  },
  "edges": [
   [
    "s",
    "a",
    1
   ],
   [
    "s",
    "b",
    1
   ],
   [
    "a",
    "b",
    0
   ],
   [
    "a",
    "c",
    0
   ],
   [
    "b",
    "d",
    0
   ],
   [
    "c",
    "d",
    0
   ],
   [
    "c",
    "e",
    0
   ],
   [
    "d",
    "f",
    0
   ],
   [
    "e",
    "f",
    0
   ],
   [
    "e",
    "g",
    0
   ],
   [
    "f",
    "g",
    0
   ],
   [
    "a",
    "d",
    0
   ]
  ],
  "start": "s",
  "goal": null,
  "mode": "all",
  "canRevisit": false,
  "note": "教授の帰着: スタートにつながる辺だけオン、他は全部オフ。光る辺は常に「訪問済み/未訪問のカット」と一致する。",
  "name_en": "Hamiltonian path reduction demo",
  "note_en": "The professor’s reduction: only the start’s edges are ON, all others OFF. The walkable edges always equal the visited/unvisited cut."
 },
 {
  "vertices": {
   "s": {
    "x": 80,
    "y": 300
   },
   "v1": {
    "x": 200,
    "y": 300
   },
   "v2": {
    "x": 330,
    "y": 300
   },
   "v3": {
    "x": 500,
    "y": 150
   },
   "v4": {
    "x": 500,
    "y": 300
   },
   "v5": {
    "x": 500,
    "y": 450
   },
   "v6": {
    "x": 670,
    "y": 300
   },
   "v7": {
    "x": 800,
    "y": 300
   },
   "t": {
    "x": 920,
    "y": 300
   }
  },
  "edges": [
   [
    "s",
    "v1",
    1
   ],
   [
    "v1",
    "v2",
    0
   ],
   [
    "v2",
    "v3",
    1
   ],
   [
    "v3",
    "v6",
    0
   ],
   [
    "v2",
    "v4",
    0
   ],
   [
    "v4",
    "v6",
    0
   ],
   [
    "v2",
    "v5",
    0
   ],
   [
    "v5",
    "v6",
    0
   ],
   [
    "v6",
    "v7",
    1
   ],
   [
    "v7",
    "t",
    0
   ]
  ],
  "start": "s",
  "goal": "t",
  "name": "S→T検証: ハブ2つ+通路3本",
  "mode": "goal",
  "canRevisit": true,
  "note": "次数4のハブ2つを通路3本でつないだ例。再訪なしでは解けず、再訪ありで最短10手。「S→T検証」タブで補題の到達集合一致を確認できる。",
  "name_en": "S→T check: 2 hubs + 3 hallways",
  "note_en": "Two degree-4 hubs joined by three hallways. Unsolvable without revisits; shortest solution with revisits is 10 moves. The S→T check tab confirms the lemma’s reachable sets match."
 }
];
if (typeof module !== "undefined" && module.exports) module.exports = { SAMPLES: IFW_SAMPLES };
