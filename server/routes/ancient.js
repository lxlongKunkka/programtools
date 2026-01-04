import express from 'express';
import AncientLevel from '../models/AncientLevel.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all levels
router.get('/levels', async (req, res) => {
  try {
    const levels = await AncientLevel.find().sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, data: levels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a specific level
router.get('/levels/:id', async (req, res) => {
  try {
    const level = await AncientLevel.findById(req.params.id);
    if (!level) return res.status(404).json({ success: false, error: 'Level not found' });
    res.json({ success: true, data: level });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new level (Protected)
router.post('/levels', authenticateToken, async (req, res) => {
  try {
    const { name, width, height, mapData, units, buildings } = req.body;
    
    const newLevel = new AncientLevel({
      name,
      width,
      height,
      mapData,
      units: units || [],
      buildings: buildings || [],
      creatorId: req.user.id
    });

    await newLevel.save();
    res.json({ success: true, data: newLevel });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize a default test level if none exists
router.post('/init-test', async (req, res) => {
    try {
        // Define a better default map (15x10)
        // 0: Plain, 1: Forest, 2: Mountain, 3: Water, 4: Castle, 5: Village
        const mapData = [
            [2, 2, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 2, 2],
            [2, 4, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 4, 2], // Blue Castle (1,1), Red Castle (13,1)
            [0, 0, 0, 3, 3, 3, 3, 0, 3, 3, 3, 3, 0, 0, 0], // River
            [0, 1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 1, 0],
            [0, 0, 0, 0, 0, 2, 5, 0, 5, 2, 0, 0, 0, 0, 0], // Neutral Villages
            [0, 0, 0, 0, 0, 2, 5, 0, 5, 2, 0, 0, 0, 0, 0],
            [0, 1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 1, 0],
            [0, 0, 0, 3, 3, 3, 3, 0, 3, 3, 3, 3, 0, 0, 0],
            [2, 4, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 4, 2], // Blue Castle (1,8), Red Castle (13,8)
            [2, 2, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 2, 2]
        ];
        const width = 15;
        const height = 10;

        // Check if "Test Level 1" exists
        let level = await AncientLevel.findOne({ name: "Test Level 1" });
        
        // Generate all units for testing
        const unitTypes = [
            'soldier', 'archer', 'king', 'skeleton', 'wolf', 
            'catapult', 'dragon', 'ghost', 'slime', 'mermaid', 'water_elemental', 
            'dark_mage', 'sorceress', 'paladin', 'elf', 'berserker', 'stone_golem', 
            'ice_elemental', 'wolf_rider', 'druid', 'wisdom_crystal'
        ];

        const testUnits = [];
        let ux = 1;
        let uy = 1;
        
        unitTypes.forEach((type, index) => {
            const team = index % 2 === 0 ? 'blue' : 'red';
            testUnits.push({ type, team, x: ux, y: uy });
            
            ux++;
            if (ux > 13) { // Wrap row
                ux = 1;
                uy++;
            }
        });

        const testBuildings = [
            { x: 1, y: 1, team: 'blue', type: 'castle' },
            { x: 1, y: 8, team: 'blue', type: 'castle' },
            { x: 13, y: 1, team: 'red', type: 'castle' },
            { x: 13, y: 8, team: 'red', type: 'castle' },
            { x: 6, y: 5, team: null, type: 'village' },
            { x: 8, y: 5, team: null, type: 'village' },
            { x: 6, y: 4, team: null, type: 'village' }, // Extra villages
            { x: 8, y: 4, team: null, type: 'village' }
        ];

        if (level) {
            // Update existing
            level.mapData = mapData;
            level.width = width;
            level.height = height;
            level.units = testUnits;
            level.buildings = testBuildings;
            await level.save();
        } else {
            // Create new
            level = new AncientLevel({
                name: "Test Level 1",
                width,
                height,
                mapData,
                units: testUnits,
                buildings: testBuildings
            });
            await level.save();
        }

        // Create or Update "Chapter 1: The Bridge"
        let campaignLevel = await AncientLevel.findOne({ name: "Chapter 1: The Bridge" });
        if (!campaignLevel) {
            // Try to find old name to rename
            campaignLevel = await AncientLevel.findOne({ name: "Chapter 1: The Escape" });
            if (campaignLevel) campaignLevel.name = "Chapter 1: The Bridge";
        }
        
        // 10x10 Map (All Terrains Showcase)
        const c1Map = [
            [118, 120, 121, 132, 133, 134, 135, 122, 123, 118], // Snow Biome
            [3, 101, 102, 181, 182, 3, 183, 3, 3, 3], // Water/Reef/Shimmer
            [2, 117, 119, 1, 3, 1, 115, 116, 2, 2], // Mountains/Forests
            [127, 5, 130, 136, 128, 128, 136, 130, 5, 127], // Buildings/Bridge
            [4, 0, 0, 0, 0, 0, 0, 0, 0, 4], // Main Lane
            [137, 0, 0, 0, 0, 0, 0, 0, 0, 137], // Castle 2
            [1, 1, 5, 0, 0, 0, 0, 5, 1, 1], // Standard
            [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], // Water Lane
            [180, 131, 0, 0, 0, 0, 0, 0, 131, 180], // Temples
            [118, 118, 1, 1, 2, 2, 1, 1, 118, 118] // Mixed
        ];

        const c1Units = [
            // BLUE TEAM (Left)
            { type: 'king', team: 'blue', x: 0, y: 4 },
            { type: 'paladin', team: 'blue', x: 2, y: 4 },
            { type: 'archer', team: 'blue', x: 1, y: 3 },
            { type: 'archer', team: 'blue', x: 1, y: 5 },
            { type: 'soldier', team: 'blue', x: 3, y: 3 },
            { type: 'soldier', team: 'blue', x: 3, y: 5 },
            { type: 'wolf', team: 'blue', x: 2, y: 2 },
            { type: 'catapult', team: 'blue', x: 0, y: 3 },
            { type: 'mermaid', team: 'blue', x: 4, y: 7 }, // Flank
            { type: 'sorceress', team: 'blue', x: 1, y: 6 },
            { type: 'elf', team: 'blue', x: 0, y: 2 },
            { type: 'druid', team: 'blue', x: 0, y: 6 },
            { type: 'wisdom_crystal', team: 'blue', x: 0, y: 5 },
            { type: 'ice_elemental', team: 'blue', x: 4, y: 2 },

            // RED TEAM (Right)
            { type: 'king', team: 'red', x: 9, y: 4 },
            { type: 'stone_golem', team: 'red', x: 7, y: 4 },
            { type: 'archer', team: 'red', x: 8, y: 3 },
            { type: 'archer', team: 'red', x: 8, y: 5 },
            { type: 'soldier', team: 'red', x: 6, y: 3 },
            { type: 'soldier', team: 'red', x: 6, y: 5 },
            { type: 'wolf_rider', team: 'red', x: 7, y: 6 },
            { type: 'dragon', team: 'red', x: 7, y: 2 }, // Air unit threat
            { type: 'water_elemental', team: 'red', x: 5, y: 1 }, // Flank
            { type: 'dark_mage', team: 'red', x: 8, y: 6 },
            { type: 'skeleton', team: 'red', x: 7, y: 3 },
            { type: 'ghost', team: 'red', x: 7, y: 5 },
            { type: 'slime', team: 'red', x: 5, y: 8 },
            { type: 'berserker', team: 'red', x: 8, y: 5 }
        ];

        const c1Buildings = [
            { x: 0, y: 4, team: 'blue', type: 'castle' },
            { x: 9, y: 4, team: 'red', type: 'castle' },
            { x: 2, y: 2, team: 'blue', type: 'village' },
            { x: 2, y: 6, team: 'blue', type: 'village' },
            { x: 7, y: 2, team: 'red', type: 'village' },
            { x: 7, y: 6, team: 'red', type: 'village' }
        ];

        if (campaignLevel) {
            campaignLevel.mapData = c1Map;
            campaignLevel.width = 10;
            campaignLevel.height = 10;
            campaignLevel.units = c1Units;
            campaignLevel.buildings = c1Buildings;
            campaignLevel.money = { blue: 10000, red: 10000 };
            campaignLevel.populationLimit = 50;
            await campaignLevel.save();
        } else {
            campaignLevel = new AncientLevel({
                name: "Chapter 1: The Bridge",
                width: 10,
                height: 10,
                mapData: c1Map,
                units: c1Units,
                buildings: c1Buildings,
                money: { blue: 10000, red: 10000 },
                populationLimit: 50
            });
            await campaignLevel.save();
        }

        return res.json({ success: true, message: "Levels initialized" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
