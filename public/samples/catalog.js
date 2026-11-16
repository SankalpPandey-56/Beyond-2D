// BEYOND - 2D CERTIFIED ARCHITECTURAL 10-ARCHETYPE CATALOG
window.BEYOND_2D_CATALOG = [
  {
    "id": "plan_01_studio",
    "num": "01",
    "name": "Modern Minimalist Studio",
    "archetype": "Compact Studio",
    "filename": "01_minimalist_studio.png",
    "dimensions": {
      "width": 6.0,
      "length": 5.5,
      "wallHeight": 2.8,
      "wallThickness": 0.22
    },
    "description": "Smart ultra-compact studio optimizing single-volume living, integrated kitchenette, and wet room.",
    "rooms": [
      {
        "id": "r1",
        "name": "Studio Living & Bedroom",
        "type": "bedroom",
        "x": -3.0,
        "z": -2.75,
        "w": 3.8,
        "d": 5.5,
        "fin": "Pale oak parquet",
        "color": "#EEF2FF",
        "relX": 0.0,
        "relZ": 0.0,
        "relW": 0.633,
        "relD": 1.0,
        "areaM2": 20.9
      },
      {
        "id": "r2",
        "name": "Modern Bathroom",
        "type": "bathroom",
        "x": 0.8,
        "z": -2.75,
        "w": 2.2,
        "d": 2.3,
        "fin": "Grey slate tile",
        "color": "#FEFCE8",
        "relX": 0.633,
        "relZ": 0.0,
        "relW": 0.367,
        "relD": 0.418,
        "areaM2": 5.1
      },
      {
        "id": "r3",
        "name": "Kitchenette & Dining",
        "type": "kitchen",
        "x": 0.8,
        "z": -0.45,
        "w": 2.2,
        "d": 3.2,
        "fin": "Honed terrazzo",
        "color": "#FFF7ED",
        "relX": 0.633,
        "relZ": 0.418,
        "relW": 0.367,
        "relD": 0.582,
        "areaM2": 7.0
      }
    ],
    "walls": [
      {
        "id": "w_ext_n",
        "startX": -3.0,
        "startZ": -2.75,
        "endX": 3.0,
        "endZ": -2.75,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "win_n1",
            "type": "window",
            "position": 0.25,
            "width": 1.4
          },
          {
            "id": "win_n2",
            "type": "window",
            "position": 0.8,
            "width": 0.9
          }
        ]
      },
      {
        "id": "w_ext_e",
        "startX": 3.0,
        "startZ": -2.75,
        "endX": 3.0,
        "endZ": 2.75,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "win_e1",
            "type": "window",
            "position": 0.65,
            "width": 1.4
          }
        ]
      },
      {
        "id": "w_ext_s",
        "startX": 3.0,
        "startZ": 2.75,
        "endX": -3.0,
        "endZ": 2.75,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "door_main",
            "type": "door",
            "position": 0.25,
            "width": 1.0,
            "hingeSide": "left"
          },
          {
            "id": "win_s1",
            "type": "window",
            "position": 0.75,
            "width": 1.4
          }
        ]
      },
      {
        "id": "w_ext_w",
        "startX": -3.0,
        "startZ": 2.75,
        "endX": -3.0,
        "endZ": -2.75,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "win_w1",
            "type": "window",
            "position": 0.5,
            "width": 1.8
          }
        ]
      },
      {
        "id": "w_int_vert",
        "startX": 0.8,
        "startZ": -2.75,
        "endX": 0.8,
        "endZ": 2.75,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.8,
        "openings": [
          {
            "id": "door_bath",
            "type": "door",
            "position": 0.2,
            "width": 0.85,
            "hingeSide": "left"
          },
          {
            "id": "door_kit",
            "type": "door",
            "position": 0.75,
            "width": 1.1,
            "hingeSide": "right"
          }
        ]
      },
      {
        "id": "w_int_horiz",
        "startX": 0.8,
        "startZ": -0.45,
        "endX": 3.0,
        "endZ": -0.45,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.8,
        "openings": []
      }
    ],
    "furniture": [
      {
        "type": "queen_bed",
        "x": -1.6,
        "z": -1.4,
        "w": 1.9,
        "d": 2.1,
        "rot": 0,
        "name": "Queen Bed"
      },
      {
        "type": "sofa",
        "x": -1.5,
        "z": 1.7,
        "w": 2.1,
        "d": 0.85,
        "rot": 0,
        "name": "Designer Sofa"
      },
      {
        "type": "coffee_table",
        "x": -1.5,
        "z": 0.8,
        "w": 1.0,
        "d": 0.5,
        "rot": 0,
        "name": "Coffee Table"
      },
      {
        "type": "shower_enclosure",
        "x": 2.2,
        "z": -2.0,
        "w": 1.1,
        "d": 0.9,
        "rot": 0,
        "name": "Shower"
      },
      {
        "type": "toilet",
        "x": 2.3,
        "z": -1.0,
        "w": 0.45,
        "d": 0.65,
        "rot": 0,
        "name": "Toilet"
      },
      {
        "type": "vanity_sink",
        "x": 1.4,
        "z": -2.3,
        "w": 0.7,
        "d": 0.45,
        "rot": 0,
        "name": "Vanity"
      },
      {
        "type": "kitchen_counter",
        "x": 2.6,
        "z": 1.1,
        "w": 0.65,
        "d": 2.4,
        "rot": 90,
        "name": "Kitchen Prep Counter"
      },
      {
        "type": "dining_table",
        "x": 1.5,
        "z": 1.6,
        "w": 0.9,
        "d": 1.1,
        "rot": 0,
        "name": "Dining Table"
      }
    ],
    "imagePath": "/samples/01_minimalist_studio.png"
  },
  {
    "id": "plan_02_urban_1bhk",
    "num": "02",
    "name": "Urban 1BHK Apartment",
    "archetype": "1-Bedroom Flat",
    "filename": "02_urban_1bhk.png",
    "dimensions": {
      "width": 8.0,
      "length": 6.5,
      "wallHeight": 2.8,
      "wallThickness": 0.22
    },
    "description": "Ergonomic 1BHK urban layout featuring segregated sleeping quarters, sunlit lounge, and balcony access.",
    "rooms": [
      {
        "id": "r1",
        "name": "Master Bedroom",
        "type": "bedroom",
        "x": -4.0,
        "z": -3.25,
        "w": 4.2,
        "d": 3.05,
        "fin": "White oak plank",
        "color": "#EEF2FF",
        "relX": 0.0,
        "relZ": 0.0,
        "relW": 0.525,
        "relD": 0.469,
        "areaM2": 12.8
      },
      {
        "id": "r2",
        "name": "Ensuite Bath",
        "type": "bathroom",
        "x": 0.2,
        "z": -3.25,
        "w": 3.8,
        "d": 2.25,
        "fin": "Carrara marble",
        "color": "#FEFCE8",
        "relX": 0.525,
        "relZ": 0.0,
        "relW": 0.475,
        "relD": 0.346,
        "areaM2": 8.5
      },
      {
        "id": "r3",
        "name": "Living Lounge & Media",
        "type": "living",
        "x": -4.0,
        "z": -0.2,
        "w": 4.2,
        "d": 3.45,
        "fin": "Smoked oak floor",
        "color": "#F0FDF4",
        "relX": 0.0,
        "relZ": 0.469,
        "relW": 0.525,
        "relD": 0.531,
        "areaM2": 14.5
      },
      {
        "id": "r4",
        "name": "Kitchen & Dining Hall",
        "type": "kitchen",
        "x": 0.2,
        "z": -1.0,
        "w": 3.8,
        "d": 4.25,
        "fin": "Honed limestone",
        "color": "#FFF7ED",
        "relX": 0.525,
        "relZ": 0.346,
        "relW": 0.475,
        "relD": 0.654,
        "areaM2": 16.1
      }
    ],
    "walls": [
      {
        "id": "w_ext_n",
        "startX": -4.0,
        "startZ": -3.25,
        "endX": 4.0,
        "endZ": -3.25,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "win_n1",
            "type": "window",
            "position": 0.25,
            "width": 1.5
          },
          {
            "id": "win_n2",
            "type": "window",
            "position": 0.75,
            "width": 1.1
          }
        ]
      },
      {
        "id": "w_ext_e",
        "startX": 4.0,
        "startZ": -3.25,
        "endX": 4.0,
        "endZ": 3.25,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "win_e1",
            "type": "window",
            "position": 0.6,
            "width": 1.6
          }
        ]
      },
      {
        "id": "w_ext_s",
        "startX": 4.0,
        "startZ": 3.25,
        "endX": -4.0,
        "endZ": 3.25,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "door_main",
            "type": "door",
            "position": 0.35,
            "width": 1.0,
            "hingeSide": "left"
          },
          {
            "id": "win_s1",
            "type": "window",
            "position": 0.75,
            "width": 1.8
          }
        ]
      },
      {
        "id": "w_ext_w",
        "startX": -4.0,
        "startZ": 3.25,
        "endX": -4.0,
        "endZ": -3.25,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "win_w1",
            "type": "window",
            "position": 0.3,
            "width": 1.5
          },
          {
            "id": "win_w2",
            "type": "window",
            "position": 0.75,
            "width": 1.5
          }
        ]
      },
      {
        "id": "w_int_v",
        "startX": 0.2,
        "startZ": -3.25,
        "endX": 0.2,
        "endZ": 3.25,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.8,
        "openings": [
          {
            "id": "d_bed",
            "type": "door",
            "position": 0.35,
            "width": 0.9,
            "hingeSide": "left"
          },
          {
            "id": "arch_liv",
            "type": "door",
            "position": 0.7,
            "width": 1.4,
            "hingeSide": "right"
          }
        ]
      },
      {
        "id": "w_int_h_left",
        "startX": -4.0,
        "startZ": -0.2,
        "endX": 0.2,
        "endZ": -0.2,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.8,
        "openings": []
      },
      {
        "id": "w_int_h_right",
        "startX": 0.2,
        "startZ": -1.0,
        "endX": 4.0,
        "endZ": -1.0,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.8,
        "openings": [
          {
            "id": "d_bath",
            "type": "door",
            "position": 0.35,
            "width": 0.85,
            "hingeSide": "left"
          }
        ]
      }
    ],
    "furniture": [
      {
        "type": "king_bed",
        "x": -2.0,
        "z": -1.8,
        "w": 2.1,
        "d": 2.15,
        "rot": 0,
        "name": "King Bed"
      },
      {
        "type": "bathtub",
        "x": 2.8,
        "z": -2.2,
        "w": 1.6,
        "d": 0.8,
        "rot": 0,
        "name": "Bathtub"
      },
      {
        "type": "toilet",
        "x": 1.0,
        "z": -2.2,
        "w": 0.45,
        "d": 0.65,
        "rot": 0,
        "name": "Toilet"
      },
      {
        "type": "sofa",
        "x": -2.0,
        "z": 1.8,
        "w": 2.4,
        "d": 0.9,
        "rot": 0,
        "name": "L-Sofa"
      },
      {
        "type": "coffee_table",
        "x": -2.0,
        "z": 0.8,
        "w": 1.1,
        "d": 0.55,
        "rot": 0,
        "name": "Coffee Table"
      },
      {
        "type": "island_counter",
        "x": 2.2,
        "z": 0.4,
        "w": 1.8,
        "d": 0.8,
        "rot": 0,
        "name": "Island Bar"
      },
      {
        "type": "dining_table",
        "x": 2.2,
        "z": 2.0,
        "w": 1.5,
        "d": 0.9,
        "rot": 0,
        "name": "Dining Table"
      }
    ],
    "imagePath": "/samples/02_urban_1bhk.png"
  },
  {
    "id": "plan_03_contemporary_2bhk",
    "num": "03",
    "name": "Contemporary 2BHK Residence",
    "archetype": "2-Bedroom Home",
    "filename": "03_contemporary_2bhk.png",
    "dimensions": {
      "width": 10.0,
      "length": 8.0,
      "wallHeight": 2.8,
      "wallThickness": 0.22
    },
    "description": "Balanced architectural residence with private master suite, guest room, dual bath, and welcoming porch.",
    "rooms": [
      {
        "id": "r1",
        "name": "Master Suite",
        "type": "bedroom",
        "x": -5.0,
        "z": -4.0,
        "w": 4.0,
        "d": 4.2,
        "fin": "Warm walnut",
        "color": "#EEF2FF",
        "relX": 0.0,
        "relZ": 0.0,
        "relW": 0.4,
        "relD": 0.525,
        "areaM2": 16.8
      },
      {
        "id": "r2",
        "name": "Central Bath",
        "type": "bathroom",
        "x": -1.0,
        "z": -4.0,
        "w": 2.2,
        "d": 2.4,
        "fin": "Grey travertine",
        "color": "#FEFCE8",
        "relX": 0.4,
        "relZ": 0.0,
        "relW": 0.22,
        "relD": 0.3,
        "areaM2": 5.3
      },
      {
        "id": "r3",
        "name": "Guest Bedroom",
        "type": "bedroom",
        "x": 1.2,
        "z": -4.0,
        "w": 3.8,
        "d": 4.2,
        "fin": "Nordic birch",
        "color": "#EEF2FF",
        "relX": 0.62,
        "relZ": 0.0,
        "relW": 0.38,
        "relD": 0.525,
        "areaM2": 16.0
      },
      {
        "id": "r4",
        "name": "Living Salon",
        "type": "living",
        "x": -5.0,
        "z": 0.2,
        "w": 6.0,
        "d": 3.8,
        "fin": "Smoked oak",
        "color": "#F0FDF4",
        "relX": 0.0,
        "relZ": 0.525,
        "relW": 0.6,
        "relD": 0.475,
        "areaM2": 22.8
      },
      {
        "id": "r5",
        "name": "Gourmet Kitchen & Dining",
        "type": "kitchen",
        "x": 1.0,
        "z": 0.2,
        "w": 4.0,
        "d": 3.8,
        "fin": "Polished basalt",
        "color": "#FFF7ED",
        "relX": 0.6,
        "relZ": 0.525,
        "relW": 0.4,
        "relD": 0.475,
        "areaM2": 15.2
      }
    ],
    "walls": [
      {
        "id": "w_ext_n",
        "startX": -5.0,
        "startZ": -4.0,
        "endX": 5.0,
        "endZ": -4.0,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "win_n1",
            "type": "window",
            "position": 0.2,
            "width": 1.5
          },
          {
            "id": "win_n2",
            "type": "window",
            "position": 0.8,
            "width": 1.5
          }
        ]
      },
      {
        "id": "w_ext_e",
        "startX": 5.0,
        "startZ": -4.0,
        "endX": 5.0,
        "endZ": 4.0,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "win_e1",
            "type": "window",
            "position": 0.25,
            "width": 1.5
          },
          {
            "id": "win_e2",
            "type": "window",
            "position": 0.75,
            "width": 1.5
          }
        ]
      },
      {
        "id": "w_ext_s",
        "startX": 5.0,
        "startZ": 4.0,
        "endX": -5.0,
        "endZ": 4.0,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "door_main",
            "type": "door",
            "position": 0.35,
            "width": 1.0,
            "hingeSide": "left"
          },
          {
            "id": "win_s1",
            "type": "window",
            "position": 0.75,
            "width": 2.2
          }
        ]
      },
      {
        "id": "w_ext_w",
        "startX": -5.0,
        "startZ": 4.0,
        "endX": -5.0,
        "endZ": -4.0,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "win_w1",
            "type": "window",
            "position": 0.3,
            "width": 1.5
          },
          {
            "id": "win_w2",
            "type": "window",
            "position": 0.75,
            "width": 1.8
          }
        ]
      },
      {
        "id": "w_int_h_main",
        "startX": -5.0,
        "startZ": 0.2,
        "endX": 5.0,
        "endZ": 0.2,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.8,
        "openings": [
          {
            "id": "d_hall1",
            "type": "door",
            "position": 0.45,
            "width": 1.2,
            "hingeSide": "left"
          }
        ]
      },
      {
        "id": "w_int_v_mbed",
        "startX": -1.0,
        "startZ": -4.0,
        "endX": -1.0,
        "endZ": 0.2,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.8,
        "openings": [
          {
            "id": "d_mbed",
            "type": "door",
            "position": 0.8,
            "width": 0.9,
            "hingeSide": "left"
          }
        ]
      },
      {
        "id": "w_int_v_gbed",
        "startX": 1.2,
        "startZ": -4.0,
        "endX": 1.2,
        "endZ": 0.2,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.8,
        "openings": [
          {
            "id": "d_gbed",
            "type": "door",
            "position": 0.8,
            "width": 0.9,
            "hingeSide": "right"
          }
        ]
      },
      {
        "id": "w_int_h_bath",
        "startX": -1.0,
        "startZ": -1.6,
        "endX": 1.2,
        "endZ": -1.6,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.8,
        "openings": [
          {
            "id": "d_cbath",
            "type": "door",
            "position": 0.5,
            "width": 0.85,
            "hingeSide": "left"
          }
        ]
      },
      {
        "id": "w_int_v_liv_kit",
        "startX": 1.0,
        "startZ": 0.2,
        "endX": 1.0,
        "endZ": 4.0,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.8,
        "openings": [
          {
            "id": "arch_kit",
            "type": "door",
            "position": 0.4,
            "width": 1.8,
            "hingeSide": "left"
          }
        ]
      }
    ],
    "furniture": [
      {
        "type": "king_bed",
        "x": -3.0,
        "z": -2.2,
        "w": 2.1,
        "d": 2.15,
        "rot": 0,
        "name": "Master Bed"
      },
      {
        "type": "queen_bed",
        "x": 3.1,
        "z": -2.2,
        "w": 1.8,
        "d": 2.1,
        "rot": 0,
        "name": "Guest Bed"
      },
      {
        "type": "shower_enclosure",
        "x": 0.1,
        "z": -3.2,
        "w": 1.2,
        "d": 0.9,
        "rot": 0,
        "name": "Shower"
      },
      {
        "type": "sofa",
        "x": -2.2,
        "z": 2.2,
        "w": 2.6,
        "d": 0.9,
        "rot": 0,
        "name": "Sectional Sofa"
      },
      {
        "type": "coffee_table",
        "x": -2.2,
        "z": 1.2,
        "w": 1.2,
        "d": 0.6,
        "rot": 0,
        "name": "Coffee Table"
      },
      {
        "type": "island_counter",
        "x": 3.0,
        "z": 1.2,
        "w": 2.2,
        "d": 0.9,
        "rot": 0,
        "name": "Chef Island"
      },
      {
        "type": "dining_table",
        "x": 3.0,
        "z": 2.8,
        "w": 1.6,
        "d": 0.95,
        "rot": 0,
        "name": "Dining Table"
      }
    ],
    "imagePath": "/samples/03_contemporary_2bhk.png"
  },
  {
    "id": "plan_04_suburban_3bhk_villa",
    "num": "04",
    "name": "Suburban 3BHK Family Villa",
    "archetype": "3-Bedroom Villa",
    "filename": "04_suburban_3bhk_villa.png",
    "dimensions": {
      "width": 12.0,
      "length": 9.0,
      "wallHeight": 3.0,
      "wallThickness": 0.24
    },
    "description": "Expansive family villa with 3 secluded bedrooms, generous social spine, open chef island, and dual baths.",
    "rooms": [
      {
        "id": "r1",
        "name": "Master Suite",
        "type": "bedroom",
        "x": -6.0,
        "z": -4.5,
        "w": 4.5,
        "d": 4.5,
        "fin": "European oak",
        "color": "#EEF2FF",
        "relX": 0.0,
        "relZ": 0.0,
        "relW": 0.375,
        "relD": 0.5,
        "areaM2": 20.2
      },
      {
        "id": "r2",
        "name": "Ensuite Bathroom",
        "type": "bathroom",
        "x": -1.5,
        "z": -4.5,
        "w": 2.4,
        "d": 2.3,
        "fin": "Terrazzo slab",
        "color": "#FEFCE8",
        "relX": 0.375,
        "relZ": 0.0,
        "relW": 0.2,
        "relD": 0.256,
        "areaM2": 5.5
      },
      {
        "id": "r3",
        "name": "Family Bath",
        "type": "bathroom",
        "x": -1.5,
        "z": -2.2,
        "w": 2.4,
        "d": 2.2,
        "fin": "Terrazzo slab",
        "color": "#FEFCE8",
        "relX": 0.375,
        "relZ": 0.256,
        "relW": 0.2,
        "relD": 0.244,
        "areaM2": 5.3
      },
      {
        "id": "r4",
        "name": "Bedroom 2 (Kids)",
        "type": "bedroom",
        "x": 0.9,
        "z": -4.5,
        "w": 5.1,
        "d": 4.5,
        "fin": "Light ash",
        "color": "#EEF2FF",
        "relX": 0.575,
        "relZ": 0.0,
        "relW": 0.425,
        "relD": 0.5,
        "areaM2": 22.9
      },
      {
        "id": "r5",
        "name": "Grand Salon Living",
        "type": "living",
        "x": -6.0,
        "z": 0.0,
        "w": 7.0,
        "d": 4.5,
        "fin": "Natural chevron oak",
        "color": "#F0FDF4",
        "relX": 0.0,
        "relZ": 0.5,
        "relW": 0.583,
        "relD": 0.5,
        "areaM2": 31.5
      },
      {
        "id": "r6",
        "name": "Chef Island & Dining",
        "type": "kitchen",
        "x": 1.0,
        "z": 0.0,
        "w": 5.0,
        "d": 4.5,
        "fin": "Polished granite",
        "color": "#FFF7ED",
        "relX": 0.583,
        "relZ": 0.5,
        "relW": 0.417,
        "relD": 0.5,
        "areaM2": 22.5
      }
    ],
    "walls": [
      {
        "id": "w_ext_n",
        "startX": -6.0,
        "startZ": -4.5,
        "endX": 6.0,
        "endZ": -4.5,
        "isExterior": true,
        "thickness": 0.24,
        "height": 3.0,
        "openings": [
          {
            "id": "win_n1",
            "type": "window",
            "position": 0.2,
            "width": 1.6
          },
          {
            "id": "win_n2",
            "type": "window",
            "position": 0.8,
            "width": 1.6
          }
        ]
      },
      {
        "id": "w_ext_e",
        "startX": 6.0,
        "startZ": -4.5,
        "endX": 6.0,
        "endZ": 4.5,
        "isExterior": true,
        "thickness": 0.24,
        "height": 3.0,
        "openings": [
          {
            "id": "win_e1",
            "type": "window",
            "position": 0.25,
            "width": 1.5
          },
          {
            "id": "win_e2",
            "type": "window",
            "position": 0.75,
            "width": 1.8
          }
        ]
      },
      {
        "id": "w_ext_s",
        "startX": 6.0,
        "startZ": 4.5,
        "endX": -6.0,
        "endZ": 4.5,
        "isExterior": true,
        "thickness": 0.24,
        "height": 3.0,
        "openings": [
          {
            "id": "door_main",
            "type": "door",
            "position": 0.35,
            "width": 1.1,
            "hingeSide": "left"
          },
          {
            "id": "win_s1",
            "type": "window",
            "position": 0.75,
            "width": 2.4
          }
        ]
      },
      {
        "id": "w_ext_w",
        "startX": -6.0,
        "startZ": 4.5,
        "endX": -6.0,
        "endZ": -4.5,
        "isExterior": true,
        "thickness": 0.24,
        "height": 3.0,
        "openings": [
          {
            "id": "win_w1",
            "type": "window",
            "position": 0.25,
            "width": 1.6
          },
          {
            "id": "win_w2",
            "type": "window",
            "position": 0.75,
            "width": 2.0
          }
        ]
      },
      {
        "id": "w_int_h_main",
        "startX": -6.0,
        "startZ": 0.0,
        "endX": 6.0,
        "endZ": 0.0,
        "isExterior": false,
        "thickness": 0.16,
        "height": 3.0,
        "openings": [
          {
            "id": "d_hall1",
            "type": "door",
            "position": 0.45,
            "width": 1.4,
            "hingeSide": "left"
          }
        ]
      },
      {
        "id": "w_int_v_mbed",
        "startX": -1.5,
        "startZ": -4.5,
        "endX": -1.5,
        "endZ": 0.0,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.0,
        "openings": [
          {
            "id": "d_mbed",
            "type": "door",
            "position": 0.85,
            "width": 0.9,
            "hingeSide": "left"
          }
        ]
      },
      {
        "id": "w_int_v_kids",
        "startX": 0.9,
        "startZ": -4.5,
        "endX": 0.9,
        "endZ": 0.0,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.0,
        "openings": [
          {
            "id": "d_kids",
            "type": "door",
            "position": 0.85,
            "width": 0.9,
            "hingeSide": "right"
          }
        ]
      },
      {
        "id": "w_int_h_baths",
        "startX": -1.5,
        "startZ": -2.2,
        "endX": 0.9,
        "endZ": -2.2,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.0,
        "openings": [
          {
            "id": "d_ebath",
            "type": "door",
            "position": 0.3,
            "width": 0.8,
            "hingeSide": "left"
          }
        ]
      },
      {
        "id": "w_int_v_liv_kit",
        "startX": 1.0,
        "startZ": 0.0,
        "endX": 1.0,
        "endZ": 4.5,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.0,
        "openings": [
          {
            "id": "arch_kit",
            "type": "door",
            "position": 0.45,
            "width": 2.0,
            "hingeSide": "left"
          }
        ]
      }
    ],
    "furniture": [
      {
        "type": "king_bed",
        "x": -3.8,
        "z": -2.3,
        "w": 2.1,
        "d": 2.2,
        "rot": 0,
        "name": "Master Bed"
      },
      {
        "type": "twin_beds",
        "x": 3.4,
        "z": -2.3,
        "w": 2.0,
        "d": 2.0,
        "rot": 0,
        "name": "Twin Beds"
      },
      {
        "type": "bathtub",
        "x": -0.3,
        "z": -3.4,
        "w": 1.5,
        "d": 0.8,
        "rot": 0,
        "name": "Bathtub"
      },
      {
        "type": "shower_enclosure",
        "x": -0.3,
        "z": -1.1,
        "w": 1.2,
        "d": 0.9,
        "rot": 0,
        "name": "Shower"
      },
      {
        "type": "sofa",
        "x": -2.5,
        "z": 2.2,
        "w": 2.8,
        "d": 1.0,
        "rot": 0,
        "name": "Modular Sofa"
      },
      {
        "type": "coffee_table",
        "x": -2.5,
        "z": 1.0,
        "w": 1.3,
        "d": 0.65,
        "rot": 0,
        "name": "Coffee Table"
      },
      {
        "type": "island_counter",
        "x": 3.5,
        "z": 1.2,
        "w": 2.5,
        "d": 1.0,
        "rot": 0,
        "name": "Grand Island"
      },
      {
        "type": "dining_table",
        "x": 3.5,
        "z": 3.0,
        "w": 1.9,
        "d": 1.0,
        "rot": 0,
        "name": "8p Dining Table"
      }
    ],
    "imagePath": "/samples/04_suburban_3bhk_villa.png"
  },
  {
    "id": "plan_05_industrial_loft",
    "num": "05",
    "name": "Industrial Open-Concept Loft",
    "archetype": "Double-Height Loft",
    "filename": "05_industrial_loft.png",
    "dimensions": {
      "width": 11.0,
      "length": 8.0,
      "wallHeight": 3.4,
      "wallThickness": 0.25
    },
    "description": "Dramatic open loft layout with polished concrete floors, steel-frame partitions, and monumental living volume.",
    "rooms": [
      {
        "id": "r1",
        "name": "Great Room (Living/Dining/Kitchen)",
        "type": "living",
        "x": -5.5,
        "z": -4.0,
        "w": 7.3,
        "d": 8.0,
        "fin": "Polished concrete",
        "color": "#F0FDF4",
        "relX": 0.0,
        "relZ": 0.0,
        "relW": 0.664,
        "relD": 1.0,
        "areaM2": 58.4
      },
      {
        "id": "r2",
        "name": "Loft Bedroom Suite",
        "type": "bedroom",
        "x": 1.8,
        "z": -4.0,
        "w": 3.7,
        "d": 4.5,
        "fin": "Distressed pine",
        "color": "#EEF2FF",
        "relX": 0.664,
        "relZ": 0.0,
        "relW": 0.336,
        "relD": 0.562,
        "areaM2": 16.7
      },
      {
        "id": "r3",
        "name": "Spa Bath & Dressing",
        "type": "bathroom",
        "x": 1.8,
        "z": 0.5,
        "w": 3.7,
        "d": 3.5,
        "fin": "Black matte porcelain",
        "color": "#FEFCE8",
        "relX": 0.664,
        "relZ": 0.562,
        "relW": 0.336,
        "relD": 0.438,
        "areaM2": 13.0
      }
    ],
    "walls": [
      {
        "id": "w_ext_n",
        "startX": -5.5,
        "startZ": -4.0,
        "endX": 5.5,
        "endZ": -4.0,
        "isExterior": true,
        "thickness": 0.25,
        "height": 3.4,
        "openings": [
          {
            "id": "win_n1",
            "type": "window",
            "position": 0.25,
            "width": 2.0
          },
          {
            "id": "win_n2",
            "type": "window",
            "position": 0.8,
            "width": 1.6
          }
        ]
      },
      {
        "id": "w_ext_e",
        "startX": 5.5,
        "startZ": -4.0,
        "endX": 5.5,
        "endZ": 4.0,
        "isExterior": true,
        "thickness": 0.25,
        "height": 3.4,
        "openings": [
          {
            "id": "win_e1",
            "type": "window",
            "position": 0.45,
            "width": 1.8
          }
        ]
      },
      {
        "id": "w_ext_s",
        "startX": 5.5,
        "startZ": 4.0,
        "endX": -5.5,
        "endZ": 4.0,
        "isExterior": true,
        "thickness": 0.25,
        "height": 3.4,
        "openings": [
          {
            "id": "door_main",
            "type": "door",
            "position": 0.3,
            "width": 1.1,
            "hingeSide": "left"
          },
          {
            "id": "win_s1",
            "type": "window",
            "position": 0.75,
            "width": 2.2
          }
        ]
      },
      {
        "id": "w_ext_w",
        "startX": -5.5,
        "startZ": 4.0,
        "endX": -5.5,
        "endZ": -4.0,
        "isExterior": true,
        "thickness": 0.25,
        "height": 3.4,
        "openings": [
          {
            "id": "win_w1",
            "type": "window",
            "position": 0.5,
            "width": 2.8
          }
        ]
      },
      {
        "id": "w_int_v",
        "startX": 1.8,
        "startZ": -4.0,
        "endX": 1.8,
        "endZ": 4.0,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.4,
        "openings": [
          {
            "id": "d_loft",
            "type": "door",
            "position": 0.35,
            "width": 1.0,
            "hingeSide": "left"
          },
          {
            "id": "d_spa",
            "type": "door",
            "position": 0.75,
            "width": 0.9,
            "hingeSide": "right"
          }
        ]
      },
      {
        "id": "w_int_h",
        "startX": 1.8,
        "startZ": 0.5,
        "endX": 5.5,
        "endZ": 0.5,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.4,
        "openings": []
      }
    ],
    "furniture": [
      {
        "type": "sofa",
        "x": -2.5,
        "z": -1.0,
        "w": 3.0,
        "d": 1.0,
        "rot": 0,
        "name": "Leather Sectional"
      },
      {
        "type": "coffee_table",
        "x": -2.5,
        "z": 0.2,
        "w": 1.4,
        "d": 0.7,
        "rot": 0,
        "name": "Industrial Table"
      },
      {
        "type": "dining_table",
        "x": -2.5,
        "z": 2.2,
        "w": 2.2,
        "d": 1.0,
        "rot": 0,
        "name": "Reclaimed Dining Table"
      },
      {
        "type": "platform_bed",
        "x": 3.6,
        "z": -2.0,
        "w": 2.0,
        "d": 2.1,
        "rot": 0,
        "name": "Platform Bed"
      },
      {
        "type": "bathtub",
        "x": 3.6,
        "z": 2.2,
        "w": 1.6,
        "d": 0.85,
        "rot": 0,
        "name": "Freestanding Tub"
      }
    ],
    "imagePath": "/samples/05_industrial_loft.png"
  },
  {
    "id": "plan_06_california_ranch",
    "num": "06",
    "name": "L-Shaped California Ranch",
    "archetype": "Ranch Residence",
    "filename": "06_california_ranch.png",
    "dimensions": {
      "width": 11.5,
      "length": 9.5,
      "wallHeight": 2.8,
      "wallThickness": 0.22
    },
    "description": "Non-convex L-shaped ranch design connecting internal private wings to a sheltered garden deck patio.",
    "rooms": [
      {
        "id": "r1",
        "name": "Vaulted Living Wing",
        "type": "living",
        "x": -5.75,
        "z": -4.75,
        "w": 6.25,
        "d": 5.25,
        "fin": "Bleached oak",
        "color": "#F0FDF4",
        "relX": 0.0,
        "relZ": 0.0,
        "relW": 0.543,
        "relD": 0.553,
        "areaM2": 32.8
      },
      {
        "id": "r2",
        "name": "Dining & Kitchen Pavilion",
        "type": "kitchen",
        "x": 0.5,
        "z": -4.75,
        "w": 5.25,
        "d": 5.25,
        "fin": "Limestone pavers",
        "color": "#FFF7ED",
        "relX": 0.543,
        "relZ": 0.0,
        "relW": 0.457,
        "relD": 0.553,
        "areaM2": 27.6
      },
      {
        "id": "r3",
        "name": "Private Master Suite",
        "type": "bedroom",
        "x": -5.75,
        "z": 0.5,
        "w": 6.25,
        "d": 4.25,
        "fin": "Soft carpet & oak",
        "color": "#EEF2FF",
        "relX": 0.0,
        "relZ": 0.553,
        "relW": 0.543,
        "relD": 0.447,
        "areaM2": 26.6
      },
      {
        "id": "r4",
        "name": "Sheltered Garden Deck",
        "type": "porch",
        "x": 0.5,
        "z": 0.5,
        "w": 5.25,
        "d": 4.25,
        "fin": "Teak deck decking",
        "color": "#F1F5F9",
        "relX": 0.543,
        "relZ": 0.553,
        "relW": 0.457,
        "relD": 0.447,
        "areaM2": 22.3
      }
    ],
    "walls": [
      {
        "id": "w_ext_n",
        "startX": -5.75,
        "startZ": -4.75,
        "endX": 5.75,
        "endZ": -4.75,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "win_n1",
            "type": "window",
            "position": 0.25,
            "width": 1.6
          },
          {
            "id": "win_n2",
            "type": "window",
            "position": 0.75,
            "width": 1.6
          }
        ]
      },
      {
        "id": "w_ext_e_top",
        "startX": 5.75,
        "startZ": -4.75,
        "endX": 5.75,
        "endZ": 0.5,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "win_e1",
            "type": "window",
            "position": 0.5,
            "width": 1.6
          }
        ]
      },
      {
        "id": "w_ext_deck_h",
        "startX": 5.75,
        "startZ": 0.5,
        "endX": 0.5,
        "endZ": 0.5,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "glass_deck",
            "type": "door",
            "position": 0.5,
            "width": 2.0,
            "hingeSide": "right"
          }
        ]
      },
      {
        "id": "w_ext_deck_v",
        "startX": 0.5,
        "startZ": 0.5,
        "endX": 0.5,
        "endZ": 4.75,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "win_deck",
            "type": "window",
            "position": 0.5,
            "width": 1.8
          }
        ]
      },
      {
        "id": "w_ext_s_bot",
        "startX": 0.5,
        "startZ": 4.75,
        "endX": -5.75,
        "endZ": 4.75,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "win_s1",
            "type": "window",
            "position": 0.5,
            "width": 1.8
          }
        ]
      },
      {
        "id": "w_ext_w",
        "startX": -5.75,
        "startZ": 4.75,
        "endX": -5.75,
        "endZ": -4.75,
        "isExterior": true,
        "thickness": 0.22,
        "height": 2.8,
        "openings": [
          {
            "id": "door_main",
            "type": "door",
            "position": 0.5,
            "width": 1.0,
            "hingeSide": "left"
          }
        ]
      },
      {
        "id": "w_int_v_top",
        "startX": 0.5,
        "startZ": -4.75,
        "endX": 0.5,
        "endZ": 0.5,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.8,
        "openings": [
          {
            "id": "arch_kit",
            "type": "door",
            "position": 0.5,
            "width": 1.6,
            "hingeSide": "left"
          }
        ]
      },
      {
        "id": "w_int_h_left",
        "startX": -5.75,
        "startZ": 0.5,
        "endX": 0.5,
        "endZ": 0.5,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.8,
        "openings": [
          {
            "id": "d_mbed",
            "type": "door",
            "position": 0.4,
            "width": 0.9,
            "hingeSide": "right"
          }
        ]
      }
    ],
    "furniture": [
      {
        "type": "sofa",
        "x": -2.6,
        "z": -2.1,
        "w": 2.6,
        "d": 0.95,
        "rot": 0,
        "name": "Hearth Sofa"
      },
      {
        "type": "coffee_table",
        "x": -2.6,
        "z": -0.8,
        "w": 1.2,
        "d": 0.6,
        "rot": 0,
        "name": "Coffee Table"
      },
      {
        "type": "king_bed",
        "x": -2.6,
        "z": 2.6,
        "w": 2.1,
        "d": 2.2,
        "rot": 0,
        "name": "California King Bed"
      },
      {
        "type": "island_counter",
        "x": 3.0,
        "z": -2.8,
        "w": 2.2,
        "d": 0.9,
        "rot": 0,
        "name": "Island Bar"
      },
      {
        "type": "dining_table",
        "x": 3.0,
        "z": -1.0,
        "w": 1.6,
        "d": 0.95,
        "rot": 0,
        "name": "Dining Suite"
      }
    ],
    "imagePath": "/samples/06_california_ranch.png"
  },
  {
    "id": "plan_07_courtyard_villa",
    "num": "07",
    "name": "Luxury Courtyard Villa",
    "archetype": "Atrium Residence",
    "filename": "07_courtyard_villa.png",
    "dimensions": {
      "width": 11.0,
      "length": 10.0,
      "wallHeight": 3.0,
      "wallThickness": 0.24
    },
    "description": "Classical central-atrium typology providing natural cross-ventilation, perimeter galleries, and serene daylighting.",
    "rooms": [
      {
        "id": "r1",
        "name": "Central Open Zen Atrium",
        "type": "porch",
        "x": -1.8,
        "z": -1.8,
        "w": 3.6,
        "d": 3.6,
        "fin": "River stone & greenery",
        "color": "#F1F5F9",
        "relX": 0.336,
        "relZ": 0.32,
        "relW": 0.327,
        "relD": 0.36,
        "areaM2": 13.0
      },
      {
        "id": "r2",
        "name": "North Reception Gallery",
        "type": "living",
        "x": -5.5,
        "z": -5.0,
        "w": 11.0,
        "d": 3.2,
        "fin": "Botticino marble",
        "color": "#F0FDF4",
        "relX": 0.0,
        "relZ": 0.0,
        "relW": 1.0,
        "relD": 0.32,
        "areaM2": 35.2
      },
      {
        "id": "r3",
        "name": "West Primary Suite",
        "type": "bedroom",
        "x": -5.5,
        "z": -1.8,
        "w": 3.7,
        "d": 6.8,
        "fin": "Fine teak",
        "color": "#EEF2FF",
        "relX": 0.0,
        "relZ": 0.32,
        "relW": 0.336,
        "relD": 0.68,
        "areaM2": 25.2
      },
      {
        "id": "r4",
        "name": "East Dining & Kitchen",
        "type": "kitchen",
        "x": 1.8,
        "z": -1.8,
        "w": 3.7,
        "d": 6.8,
        "fin": "Honed granite",
        "color": "#FFF7ED",
        "relX": 0.664,
        "relZ": 0.32,
        "relW": 0.336,
        "relD": 0.68,
        "areaM2": 25.2
      },
      {
        "id": "r5",
        "name": "South Guest Wing",
        "type": "bedroom",
        "x": -1.8,
        "z": 1.8,
        "w": 3.6,
        "d": 3.2,
        "fin": "Fine teak",
        "color": "#EEF2FF",
        "relX": 0.336,
        "relZ": 0.68,
        "relW": 0.327,
        "relD": 0.32,
        "areaM2": 11.5
      }
    ],
    "walls": [
      {
        "id": "w_ext_n",
        "startX": -5.5,
        "startZ": -5.0,
        "endX": 5.5,
        "endZ": -5.0,
        "isExterior": true,
        "thickness": 0.24,
        "height": 3.0,
        "openings": [
          {
            "id": "win_n1",
            "type": "window",
            "position": 0.25,
            "width": 1.6
          },
          {
            "id": "win_n2",
            "type": "window",
            "position": 0.75,
            "width": 1.6
          }
        ]
      },
      {
        "id": "w_ext_e",
        "startX": 5.5,
        "startZ": -5.0,
        "endX": 5.5,
        "endZ": 5.0,
        "isExterior": true,
        "thickness": 0.24,
        "height": 3.0,
        "openings": [
          {
            "id": "win_e1",
            "type": "window",
            "position": 0.5,
            "width": 1.8
          }
        ]
      },
      {
        "id": "w_ext_s",
        "startX": 5.5,
        "startZ": 5.0,
        "endX": -5.5,
        "endZ": 5.0,
        "isExterior": true,
        "thickness": 0.24,
        "height": 3.0,
        "openings": [
          {
            "id": "door_main",
            "type": "door",
            "position": 0.5,
            "width": 1.1,
            "hingeSide": "left"
          }
        ]
      },
      {
        "id": "w_ext_w",
        "startX": -5.5,
        "startZ": 5.0,
        "endX": -5.5,
        "endZ": -5.0,
        "isExterior": true,
        "thickness": 0.24,
        "height": 3.0,
        "openings": [
          {
            "id": "win_w1",
            "type": "window",
            "position": 0.5,
            "width": 1.8
          }
        ]
      },
      {
        "id": "w_atr_n",
        "startX": -1.8,
        "startZ": -1.8,
        "endX": 1.8,
        "endZ": -1.8,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.0,
        "openings": [
          {
            "id": "g_atr_n",
            "type": "window",
            "position": 0.5,
            "width": 2.8
          }
        ]
      },
      {
        "id": "w_atr_e",
        "startX": 1.8,
        "startZ": -1.8,
        "endX": 1.8,
        "endZ": 1.8,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.0,
        "openings": [
          {
            "id": "g_atr_e",
            "type": "window",
            "position": 0.5,
            "width": 2.8
          }
        ]
      },
      {
        "id": "w_atr_s",
        "startX": 1.8,
        "startZ": 1.8,
        "endX": -1.8,
        "endZ": 1.8,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.0,
        "openings": [
          {
            "id": "g_atr_s",
            "type": "door",
            "position": 0.5,
            "width": 1.8,
            "hingeSide": "left"
          }
        ]
      },
      {
        "id": "w_atr_w",
        "startX": -1.8,
        "startZ": 1.8,
        "endX": -1.8,
        "endZ": -1.8,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.0,
        "openings": [
          {
            "id": "g_atr_w",
            "type": "window",
            "position": 0.5,
            "width": 2.8
          }
        ]
      }
    ],
    "furniture": [
      {
        "type": "sofa",
        "x": 0.0,
        "z": -3.4,
        "w": 3.0,
        "d": 0.95,
        "rot": 0,
        "name": "Lounge Ensemble"
      },
      {
        "type": "king_bed",
        "x": -3.6,
        "z": 1.5,
        "w": 2.1,
        "d": 2.2,
        "rot": 0,
        "name": "Canopy Bed"
      },
      {
        "type": "dining_table",
        "x": 3.6,
        "z": 1.5,
        "w": 1.8,
        "d": 1.0,
        "rot": 0,
        "name": "Formal Dining Table"
      },
      {
        "type": "queen_bed",
        "x": 0.0,
        "z": 3.4,
        "w": 1.8,
        "d": 2.1,
        "rot": 0,
        "name": "Guest Bed"
      }
    ],
    "imagePath": "/samples/07_courtyard_villa.png"
  },
  {
    "id": "plan_08_duplex_residence",
    "num": "08",
    "name": "Modern Duplex Ground Floor",
    "archetype": "Townhouse Ground",
    "filename": "08_duplex_residence.png",
    "dimensions": {
      "width": 10.0,
      "length": 8.0,
      "wallHeight": 3.1,
      "wallThickness": 0.22
    },
    "description": "Multi-level townhouse ground floor with sculptural staircase core, deep living salon, and garden outlook.",
    "rooms": [
      {
        "id": "r1",
        "name": "Double-Height Great Room",
        "type": "living",
        "x": -5.0,
        "z": -4.0,
        "w": 6.5,
        "d": 4.8,
        "fin": "Nordic white oak",
        "color": "#F0FDF4",
        "relX": 0.0,
        "relZ": 0.0,
        "relW": 0.65,
        "relD": 0.6,
        "areaM2": 31.2
      },
      {
        "id": "r2",
        "name": "Kitchen & Breakfast Island",
        "type": "kitchen",
        "x": 1.5,
        "z": -4.0,
        "w": 3.5,
        "d": 4.5,
        "fin": "Quartz slab",
        "color": "#FFF7ED",
        "relX": 0.65,
        "relZ": 0.0,
        "relW": 0.35,
        "relD": 0.562,
        "areaM2": 15.8
      },
      {
        "id": "r3",
        "name": "Floating Staircase Gallery",
        "type": "hallway",
        "x": 1.5,
        "z": 0.5,
        "w": 3.5,
        "d": 3.5,
        "fin": "Exposed aggregate",
        "color": "#FAF5FF",
        "relX": 0.65,
        "relZ": 0.562,
        "relW": 0.35,
        "relD": 0.438,
        "areaM2": 12.2
      },
      {
        "id": "r4",
        "name": "Garden Guest Suite",
        "type": "bedroom",
        "x": -5.0,
        "z": 0.8,
        "w": 6.5,
        "d": 3.2,
        "fin": "Warm walnut",
        "color": "#EEF2FF",
        "relX": 0.0,
        "relZ": 0.6,
        "relW": 0.65,
        "relD": 0.4,
        "areaM2": 20.8
      }
    ],
    "walls": [
      {
        "id": "w_ext_n",
        "startX": -5.0,
        "startZ": -4.0,
        "endX": 5.0,
        "endZ": -4.0,
        "isExterior": true,
        "thickness": 0.22,
        "height": 3.1,
        "openings": [
          {
            "id": "win_n1",
            "type": "window",
            "position": 0.25,
            "width": 1.6
          },
          {
            "id": "win_n2",
            "type": "window",
            "position": 0.75,
            "width": 1.6
          }
        ]
      },
      {
        "id": "w_ext_e",
        "startX": 5.0,
        "startZ": -4.0,
        "endX": 5.0,
        "endZ": 4.0,
        "isExterior": true,
        "thickness": 0.22,
        "height": 3.1,
        "openings": [
          {
            "id": "win_e1",
            "type": "window",
            "position": 0.45,
            "width": 1.6
          }
        ]
      },
      {
        "id": "w_ext_s",
        "startX": 5.0,
        "startZ": 4.0,
        "endX": -5.0,
        "endZ": 4.0,
        "isExterior": true,
        "thickness": 0.22,
        "height": 3.1,
        "openings": [
          {
            "id": "door_main",
            "type": "door",
            "position": 0.35,
            "width": 1.0,
            "hingeSide": "left"
          },
          {
            "id": "win_s1",
            "type": "window",
            "position": 0.75,
            "width": 1.8
          }
        ]
      },
      {
        "id": "w_ext_w",
        "startX": -5.0,
        "startZ": 4.0,
        "endX": -5.0,
        "endZ": -4.0,
        "isExterior": true,
        "thickness": 0.22,
        "height": 3.1,
        "openings": [
          {
            "id": "win_w1",
            "type": "window",
            "position": 0.5,
            "width": 2.2
          }
        ]
      },
      {
        "id": "w_int_v",
        "startX": 1.5,
        "startZ": -4.0,
        "endX": 1.5,
        "endZ": 4.0,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.1,
        "openings": [
          {
            "id": "arch_kit",
            "type": "door",
            "position": 0.3,
            "width": 1.6,
            "hingeSide": "left"
          },
          {
            "id": "d_stair",
            "type": "door",
            "position": 0.75,
            "width": 1.0,
            "hingeSide": "right"
          }
        ]
      },
      {
        "id": "w_int_h_bed",
        "startX": -5.0,
        "startZ": 0.8,
        "endX": 1.5,
        "endZ": 0.8,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.1,
        "openings": [
          {
            "id": "d_gbed",
            "type": "door",
            "position": 0.4,
            "width": 0.9,
            "hingeSide": "left"
          }
        ]
      }
    ],
    "furniture": [
      {
        "type": "sofa",
        "x": -2.0,
        "z": -1.8,
        "w": 2.8,
        "d": 1.0,
        "rot": 0,
        "name": "Corner Lounge"
      },
      {
        "type": "coffee_table",
        "x": -2.0,
        "z": -0.6,
        "w": 1.2,
        "d": 0.6,
        "rot": 0,
        "name": "Coffee Table"
      },
      {
        "type": "queen_bed",
        "x": -2.0,
        "z": 2.4,
        "w": 1.9,
        "d": 2.1,
        "rot": 0,
        "name": "Guest Bed"
      },
      {
        "type": "island_counter",
        "x": 3.2,
        "z": -2.0,
        "w": 2.0,
        "d": 0.9,
        "rot": 0,
        "name": "Breakfast Island"
      }
    ],
    "imagePath": "/samples/08_duplex_residence.png"
  },
  {
    "id": "plan_09_executive_penthouse",
    "num": "09",
    "name": "Executive Penthouse Suite",
    "archetype": "Luxury Penthouse",
    "filename": "09_executive_penthouse.png",
    "dimensions": {
      "width": 12.5,
      "length": 8.5,
      "wallHeight": 3.2,
      "wallThickness": 0.24
    },
    "description": "Crown-level penthouse with continuous glass perimeter curtain walls, entertainment salon, and spa ensuite.",
    "rooms": [
      {
        "id": "r1",
        "name": "Panoramic Skyline Salon",
        "type": "living",
        "x": -6.25,
        "z": -4.25,
        "w": 7.75,
        "d": 5.05,
        "fin": "Calacatta marble",
        "color": "#F0FDF4",
        "relX": 0.0,
        "relZ": 0.0,
        "relW": 0.62,
        "relD": 0.594,
        "areaM2": 39.1
      },
      {
        "id": "r2",
        "name": "Chef Kitchen & Wine Bar",
        "type": "kitchen",
        "x": 1.5,
        "z": -4.25,
        "w": 4.75,
        "d": 5.05,
        "fin": "Nero Marquina marble",
        "color": "#FFF7ED",
        "relX": 0.62,
        "relZ": 0.0,
        "relW": 0.38,
        "relD": 0.594,
        "areaM2": 24.0
      },
      {
        "id": "r3",
        "name": "Presidential Master Suite",
        "type": "bedroom",
        "x": -6.25,
        "z": 0.8,
        "w": 6.25,
        "d": 3.45,
        "fin": "Silk carpet & ebony",
        "color": "#EEF2FF",
        "relX": 0.0,
        "relZ": 0.594,
        "relW": 0.5,
        "relD": 0.406,
        "areaM2": 21.6
      },
      {
        "id": "r4",
        "name": "Master Spa Ensuite",
        "type": "bathroom",
        "x": 0.0,
        "z": 0.8,
        "w": 6.25,
        "d": 3.45,
        "fin": "Honed Statuario",
        "color": "#FEFCE8",
        "relX": 0.5,
        "relZ": 0.594,
        "relW": 0.5,
        "relD": 0.406,
        "areaM2": 21.6
      }
    ],
    "walls": [
      {
        "id": "w_ext_n",
        "startX": -6.25,
        "startZ": -4.25,
        "endX": 6.25,
        "endZ": -4.25,
        "isExterior": true,
        "thickness": 0.24,
        "height": 3.2,
        "openings": [
          {
            "id": "win_n1",
            "type": "window",
            "position": 0.25,
            "width": 2.2
          },
          {
            "id": "win_n2",
            "type": "window",
            "position": 0.75,
            "width": 2.2
          }
        ]
      },
      {
        "id": "w_ext_e",
        "startX": 6.25,
        "startZ": -4.25,
        "endX": 6.25,
        "endZ": 4.25,
        "isExterior": true,
        "thickness": 0.24,
        "height": 3.2,
        "openings": [
          {
            "id": "win_e1",
            "type": "window",
            "position": 0.5,
            "width": 2.0
          }
        ]
      },
      {
        "id": "w_ext_s",
        "startX": 6.25,
        "startZ": 4.25,
        "endX": -6.25,
        "endZ": 4.25,
        "isExterior": true,
        "thickness": 0.24,
        "height": 3.2,
        "openings": [
          {
            "id": "door_main",
            "type": "door",
            "position": 0.35,
            "width": 1.1,
            "hingeSide": "left"
          },
          {
            "id": "win_s1",
            "type": "window",
            "position": 0.75,
            "width": 2.4
          }
        ]
      },
      {
        "id": "w_ext_w",
        "startX": -6.25,
        "startZ": 4.25,
        "endX": -6.25,
        "endZ": -4.25,
        "isExterior": true,
        "thickness": 0.24,
        "height": 3.2,
        "openings": [
          {
            "id": "win_w1",
            "type": "window",
            "position": 0.5,
            "width": 2.4
          }
        ]
      },
      {
        "id": "w_int_h_main",
        "startX": -6.25,
        "startZ": 0.8,
        "endX": 6.25,
        "endZ": 0.8,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.2,
        "openings": [
          {
            "id": "d_bed",
            "type": "door",
            "position": 0.25,
            "width": 1.0,
            "hingeSide": "left"
          }
        ]
      },
      {
        "id": "w_int_v_top",
        "startX": 1.5,
        "startZ": -4.25,
        "endX": 1.5,
        "endZ": 0.8,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.2,
        "openings": [
          {
            "id": "arch_bar",
            "type": "door",
            "position": 0.5,
            "width": 2.2,
            "hingeSide": "left"
          }
        ]
      },
      {
        "id": "w_int_v_bot",
        "startX": 0.0,
        "startZ": 0.8,
        "endX": 0.0,
        "endZ": 4.25,
        "isExterior": false,
        "thickness": 0.15,
        "height": 3.2,
        "openings": [
          {
            "id": "d_spa",
            "type": "door",
            "position": 0.5,
            "width": 1.0,
            "hingeSide": "right"
          }
        ]
      }
    ],
    "furniture": [
      {
        "type": "sofa",
        "x": -2.8,
        "z": -1.8,
        "w": 3.2,
        "d": 1.1,
        "rot": 0,
        "name": "Designer Sofas"
      },
      {
        "type": "coffee_table",
        "x": -2.8,
        "z": -0.4,
        "w": 1.4,
        "d": 0.7,
        "rot": 0,
        "name": "Cocktail Table"
      },
      {
        "type": "island_counter",
        "x": 3.8,
        "z": -2.0,
        "w": 2.6,
        "d": 1.0,
        "rot": 0,
        "name": "Waterfall Island"
      },
      {
        "type": "king_bed",
        "x": -3.0,
        "z": 2.6,
        "w": 2.2,
        "d": 2.2,
        "rot": 0,
        "name": "Presidential Bed"
      },
      {
        "type": "bathtub",
        "x": 3.0,
        "z": 2.6,
        "w": 1.8,
        "d": 0.95,
        "rot": 0,
        "name": "Oval Spa Tub"
      }
    ],
    "imagePath": "/samples/09_executive_penthouse.png"
  },
  {
    "id": "plan_10_micro_living_pod",
    "num": "10",
    "name": "Micro-Living Modular Pod",
    "archetype": "Modular Tiny Home",
    "filename": "10_micro_living_pod.png",
    "dimensions": {
      "width": 5.8,
      "length": 3.8,
      "wallHeight": 2.6,
      "wallThickness": 0.2
    },
    "description": "High-efficiency factory-built modular pod with transformable furniture, compact wet bath, and entry deck.",
    "rooms": [
      {
        "id": "r1",
        "name": "Transformable Living & Bed Pod",
        "type": "bedroom",
        "x": -2.9,
        "z": -1.9,
        "w": 3.8,
        "d": 3.8,
        "fin": "Birch plywood",
        "color": "#EEF2FF",
        "relX": 0.0,
        "relZ": 0.0,
        "relW": 0.655,
        "relD": 1.0,
        "areaM2": 14.4
      },
      {
        "id": "r2",
        "name": "Compact Kitchenette",
        "type": "kitchen",
        "x": 0.9,
        "z": -1.9,
        "w": 2.0,
        "d": 2.0,
        "fin": "Stainless steel & birch",
        "color": "#FFF7ED",
        "relX": 0.655,
        "relZ": 0.0,
        "relW": 0.345,
        "relD": 0.526,
        "areaM2": 4.0
      },
      {
        "id": "r3",
        "name": "Precast Wet Room",
        "type": "bathroom",
        "x": 0.9,
        "z": 0.1,
        "w": 2.0,
        "d": 1.7999999999999998,
        "fin": "Microcement",
        "color": "#FEFCE8",
        "relX": 0.655,
        "relZ": 0.526,
        "relW": 0.345,
        "relD": 0.474,
        "areaM2": 3.6
      }
    ],
    "walls": [
      {
        "id": "w_ext_n",
        "startX": -2.9,
        "startZ": -1.9,
        "endX": 2.9,
        "endZ": -1.9,
        "isExterior": true,
        "thickness": 0.2,
        "height": 2.6,
        "openings": [
          {
            "id": "win_n1",
            "type": "window",
            "position": 0.35,
            "width": 1.4
          }
        ]
      },
      {
        "id": "w_ext_e",
        "startX": 2.9,
        "startZ": -1.9,
        "endX": 2.9,
        "endZ": 1.9,
        "isExterior": true,
        "thickness": 0.2,
        "height": 2.6,
        "openings": [
          {
            "id": "win_e1",
            "type": "window",
            "position": 0.35,
            "width": 0.9
          }
        ]
      },
      {
        "id": "w_ext_s",
        "startX": 2.9,
        "startZ": 1.9,
        "endX": -2.9,
        "endZ": 1.9,
        "isExterior": true,
        "thickness": 0.2,
        "height": 2.6,
        "openings": [
          {
            "id": "door_main",
            "type": "door",
            "position": 0.3,
            "width": 0.9,
            "hingeSide": "left"
          },
          {
            "id": "win_s1",
            "type": "window",
            "position": 0.75,
            "width": 1.2
          }
        ]
      },
      {
        "id": "w_ext_w",
        "startX": -2.9,
        "startZ": 1.9,
        "endX": -2.9,
        "endZ": -1.9,
        "isExterior": true,
        "thickness": 0.2,
        "height": 2.6,
        "openings": [
          {
            "id": "win_w1",
            "type": "window",
            "position": 0.5,
            "width": 1.4
          }
        ]
      },
      {
        "id": "w_int_v",
        "startX": 0.9,
        "startZ": -1.9,
        "endX": 0.9,
        "endZ": 1.9,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.6,
        "openings": [
          {
            "id": "arch_kit",
            "type": "door",
            "position": 0.3,
            "width": 0.9,
            "hingeSide": "left"
          },
          {
            "id": "d_wet",
            "type": "door",
            "position": 0.75,
            "width": 0.75,
            "hingeSide": "right"
          }
        ]
      },
      {
        "id": "w_int_h",
        "startX": 0.9,
        "startZ": 0.1,
        "endX": 2.9,
        "endZ": 0.1,
        "isExterior": false,
        "thickness": 0.15,
        "height": 2.6,
        "openings": []
      }
    ],
    "furniture": [
      {
        "type": "murphy_bed_sofa",
        "x": -1.0,
        "z": 0.0,
        "w": 2.0,
        "d": 1.6,
        "rot": 0,
        "name": "Murphy Bed & Sofa"
      },
      {
        "type": "kitchen_counter",
        "x": 1.9,
        "z": -0.9,
        "w": 0.6,
        "d": 1.6,
        "rot": 90,
        "name": "Kitchenette"
      },
      {
        "type": "shower_enclosure",
        "x": 1.9,
        "z": 1.0,
        "w": 0.8,
        "d": 0.8,
        "rot": 0,
        "name": "Wet Room Shower"
      }
    ],
    "imagePath": "/samples/10_micro_living_pod.png"
  }
];
