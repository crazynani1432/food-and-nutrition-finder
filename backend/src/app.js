require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { Op } = require('sequelize');

const { sequelize, User, UserProfile, Food, Meal, MealItem, initDatabase } = require('./config/db');
const { calculateItemNutrients, calculateMealTotals } = require('./utils/nutritionMath');
const { analyzePlateImage } = require('./services/gemini');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me';

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check route for deployment liveness and zero-lag uptime monitors
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Set up image upload handler
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (process.env.MAX_FILE_SIZE_MB || 5) * 1024 * 1024 }
});

// Middleware: Authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required. Format: Bearer <token>' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired access token' });
    }
    req.user = decodedUser;
    next();
  });
}

// ---------------------------------------------------------------------
// Auth Routes
// ---------------------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required' });
  }

  const cleanIdentifier = email.trim();
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password should be at least 4 characters long' });
  }

  try {
    const existingUser = await User.findOne({ 
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('email')), 
        cleanIdentifier.toLowerCase()
      ) 
    });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this username or email already exists. Please sign in.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const displayName = (name && name.trim()) || cleanIdentifier.split('@')[0];

    const newUser = await User.create({ 
      email: cleanIdentifier, 
      passwordHash,
      name: displayName 
    });
    
    // Create initialized user profile with standard defaults (pending user completion)
    await UserProfile.create({ 
      userId: newUser.id,
      isCompleted: false,
      age: 26,
      heightCm: 172,
      weightKg: 68,
      activityLevel: 'moderately_active',
      fitnessGoal: 'maintain_weight',
      dietaryPreference: 'omnivore',
      dailyCalorieTarget: 2000,
      dailyProteinTargetG: 100,
      dailyCarbsTargetG: 250,
      dailyFatTargetG: 65,
      dailyFiberTargetG: 28
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: displayName }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    return res.status(201).json({ 
      token, 
      user: { id: newUser.id, email: newUser.email, name: displayName },
      message: 'Account registered successfully' 
    });
  } catch (error) {
    return res.status(500).json({ error: `Registration failed: ${error.message}` });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required' });
  }

  const cleanIdentifier = email.trim();

  try {
    const user = await User.findOne({ 
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('email')), 
        cleanIdentifier.toLowerCase()
      ) 
    });
    if (!user) {
      return res.status(400).json({ error: 'Account not found. Please register or check credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password. Please try again.' });
    }

    const displayName = user.name || user.email.split('@')[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, name: displayName }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    return res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: displayName },
      message: 'Logged in successfully' 
    });
  } catch (error) {
    return res.status(500).json({ error: `Login failed: ${error.message}` });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'name', 'createdAt']
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const displayName = user.name || user.email.split('@')[0];
    return res.json({ 
      user: { id: user.id, email: user.email, name: displayName, createdAt: user.createdAt } 
    });
  } catch (error) {
    return res.status(500).json({ error: `Failed to fetch session: ${error.message}` });
  }
});

// ---------------------------------------------------------------------
// Profile Routes
// ---------------------------------------------------------------------
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    let profile = await UserProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      profile = await UserProfile.create({
        userId: req.user.id,
        isCompleted: false,
        age: 26,
        heightCm: 172,
        weightKg: 68,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain_weight',
        dietaryPreference: 'omnivore',
        dailyCalorieTarget: 2000,
        dailyProteinTargetG: 100,
        dailyCarbsTargetG: 250,
        dailyFatTargetG: 65,
        dailyFiberTargetG: 28
      });
    }
    return res.json(profile);
  } catch (error) {
    return res.status(500).json({ error: `Failed to fetch profile: ${error.message}` });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  const { age, heightCm, weightKg, activityLevel, fitnessGoal, dietaryPreference, allergenList } = req.body;
  
  try {
    const profile = await UserProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Dynamic target calculations using Harris-Benedict formulas
    let bmr = 0;
    // Fallback default gender math (averaging male/female for general default targets)
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5; 

    let multiplier = 1.2;
    if (activityLevel === 'lightly_active') multiplier = 1.375;
    if (activityLevel === 'moderately_active') multiplier = 1.55;
    if (activityLevel === 'very_active') multiplier = 1.725;

    let dailyCalorieTarget = Math.round(bmr * multiplier);

    if (fitnessGoal === 'lose_weight') dailyCalorieTarget -= 500;
    if (fitnessGoal === 'gain_weight') dailyCalorieTarget += 500;

    // Macro distributions (e.g. 50% Carbs, 20% Protein, 30% Fat)
    const dailyProteinTargetG = Math.round((dailyCalorieTarget * 0.20) / 4);
    const dailyCarbsTargetG = Math.round((dailyCalorieTarget * 0.50) / 4);
    const dailyFatTargetG = Math.round((dailyCalorieTarget * 0.30) / 9);
    const dailyFiberTargetG = Math.round((dailyCalorieTarget / 1000) * 14); // 14g per 1000kcal

    await profile.update({
      isCompleted: true,
      age,
      heightCm,
      weightKg,
      activityLevel,
      fitnessGoal,
      dietaryPreference,
      allergenList,
      dailyCalorieTarget,
      dailyProteinTargetG,
      dailyCarbsTargetG,
      dailyFatTargetG,
      dailyFiberTargetG
    });

    return res.json({ profile, message: 'Profile targets updated successfully' });
  } catch (error) {
    return res.status(500).json({ error: `Failed to update profile: ${error.message}` });
  }
});

// ---------------------------------------------------------------------
// Food Directory Routes
// ---------------------------------------------------------------------
app.get('/api/foods/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const foods = await Food.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { regionalName: { [Op.like]: `%${q}%` } }
        ]
      },
      limit: 10
    });
    return res.json(foods);
  } catch (error) {
    return res.status(500).json({ error: `Food search failed: ${error.message}` });
  }
});

// ---------------------------------------------------------------------
// Meal Logging Routes
// ---------------------------------------------------------------------
app.post('/api/meals', authenticateToken, async (req, res) => {
  const { mealType, logDate, logTime, analysisMethod, imageUrl, items } = req.body;

  if (!mealType || !logDate || !logTime || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing meal logging information' });
  }

  try {
    const calculatedItems = [];

    // Calculate nutrients item-by-item deterministically
    for (const item of items) {
      const food = await Food.findByPk(item.foodId);
      if (!food) {
        return res.status(404).json({ error: `Food item with ID ${item.foodId} not found` });
      }

      const calculated = calculateItemNutrients(
        item.loggedQuantity,
        food.conversionToGrams,
        {
          caloriesPer100g: food.caloriesPer100g,
          proteinPer100g: food.proteinPer100g,
          carbsPer100g: food.carbsPer100g,
          fatPer100g: food.fatPer100g,
          fiberPer100g: food.fiberPer100g,
          sodiumPer100g: food.sodiumPer100g
        }
      );

      calculatedItems.push({
        foodId: food.id,
        loggedQuantity: item.loggedQuantity,
        loggedUnit: item.loggedUnit || food.servingUnitDefault,
        normalizedGrams: calculated.normalizedGrams,
        calories: calculated.calories,
        protein: calculated.protein,
        carbs: calculated.carbs,
        fat: calculated.fat,
        fiber: calculated.fiber,
        estimationType: item.estimationType || 'verified_db'
      });
    }

    const totals = calculateMealTotals(calculatedItems);

    const meal = await Meal.create({
      userId: req.user.id,
      mealType,
      logDate,
      logTime,
      totalCalories: totals.totalCalories,
      totalProteinG: totals.totalProtein,
      totalCarbsG: totals.totalCarbs,
      totalFatG: totals.totalFat,
      totalFiberG: totals.totalFiber,
      analysisMethod,
      imageUrl
    });

    // Create child meal items records
    const mealItemsToCreate = calculatedItems.map(item => ({
      ...item,
      mealId: meal.id
    }));
    await MealItem.bulkCreate(mealItemsToCreate);

    return res.status(201).json({ meal, items: mealItemsToCreate, message: 'Meal logged successfully' });
  } catch (error) {
    return res.status(500).json({ error: `Failed to save meal: ${error.message}` });
  }
});

app.get('/api/meals/daily-summary', authenticateToken, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });

  try {
    const meals = await Meal.findAll({
      where: { userId: req.user.id, logDate: date }
    });

    const summary = {
      totalCalories: 0,
      totalProteinG: 0,
      totalCarbsG: 0,
      totalFatG: 0,
      totalFiberG: 0
    };

    meals.forEach(m => {
      summary.totalCalories += m.totalCalories;
      summary.totalProteinG += m.totalProteinG;
      summary.totalCarbsG += m.totalCarbsG;
      summary.totalFatG += m.totalFatG;
      summary.totalFiberG += m.totalFiberG;
    });

    // Round summary values
    Object.keys(summary).forEach(k => {
      summary[k] = Number(summary[k].toFixed(1));
    });

    const profile = await UserProfile.findOne({ where: { userId: req.user.id } });

    return res.json({
      summary,
      targets: profile ? {
        calories: profile.dailyCalorieTarget,
        protein: profile.dailyProteinTargetG,
        carbs: profile.dailyCarbsTargetG,
        fat: profile.dailyFatTargetG,
        fiber: profile.dailyFiberTargetG
      } : null
    });
  } catch (error) {
    return res.status(500).json({ error: `Summary fetch failed: ${error.message}` });
  }
});

app.get('/api/meals/history', authenticateToken, async (req, res) => {
  const { start_date, end_date } = req.query;
  
  const whereClause = { userId: req.user.id };
  if (start_date && end_date) {
    whereClause.logDate = { [Op.between]: [start_date, end_date] };
  }

  try {
    const meals = await Meal.findAll({
      where: whereClause,
      include: [
        {
          model: MealItem,
          include: [Food]
        }
      ],
      order: [['logDate', 'DESC'], ['logTime', 'DESC']]
    });
    return res.json(meals);
  } catch (error) {
    return res.status(500).json({ error: `History fetch failed: ${error.message}` });
  }
});

app.delete('/api/meals/:id', authenticateToken, async (req, res) => {
  try {
    const meal = await Meal.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    await meal.destroy();
    return res.json({ message: 'Meal deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: `Failed to delete meal: ${error.message}` });
  }
});

// ---------------------------------------------------------------------
// AI Analysis Route
// ---------------------------------------------------------------------
app.post('/api/ai/analyze-plate', authenticateToken, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' });
  }

  try {
    let aiResponse;

    if (process.env.GEMINI_API_KEY) {
      // Execute live API call to Gemini
      aiResponse = await analyzePlateImage(req.file.buffer, req.file.mimetype);
    } else {
      // Mock fallback: Simulate analysis results if Gemini API Key is missing (convenient for local tests)
      console.log('Gemini API key missing. Serving demo analysis response.');
      aiResponse = {
        detected_items: [
          { food_name: "Cooked White Rice", estimated_weight_grams: 150.0, confidence: 0.95 },
          { food_name: "Dal Tadka (Cooked)", estimated_weight_grams: 150.0, confidence: 0.90 },
          { food_name: "Assorted Mixed Salad", estimated_weight_grams: 80.0, confidence: 0.85 }
        ]
      };
    }

    const detectedItems = Array.isArray(aiResponse) 
      ? aiResponse 
      : (aiResponse?.detected_items || aiResponse?.items || []);

    const calculatedItems = [];

    for (const item of detectedItems) {
      if (!item.food_name) continue;

      // Search matching food in database
      let dbFood = await Food.findOne({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${item.food_name}%` } },
            { regionalName: { [Op.like]: `%${item.food_name}%` } }
          ]
        }
      });

      // If food not found in database, insert it as an AI-discovered food item
      if (!dbFood) {
        dbFood = await Food.create({
          name: item.food_name,
          regionalName: item.food_name,
          foodType: 'cooked',
          verified: false,
          servingSizeDefault: 100,
          servingUnitDefault: 'g',
          conversionToGrams: 1.0,
          caloriesPer100g: Number(item.calories_per_100g) || 150,
          proteinPer100g: Number(item.protein_per_100g) || 5,
          carbsPer100g: Number(item.carbs_per_100g) || 20,
          fatPer100g: Number(item.fat_per_100g) || 5,
          fiberPer100g: Number(item.fiber_per_100g) || 2,
          sodiumPer100g: Number(item.sodium_per_100g) || 100
        });
      }

      // Compute nutrition counts based on visual weight
      const loggedQty = (item.estimated_weight_grams || 100) / (dbFood.conversionToGrams || 1.0);
      const calculated = calculateItemNutrients(
        loggedQty,
        dbFood.conversionToGrams || 1.0,
        dbFood
      );

      calculatedItems.push({
        foodId: dbFood.id,
        foodName: dbFood.name,
        loggedQuantity: Number(loggedQty.toFixed(1)),
        loggedUnit: dbFood.servingUnitDefault || 'g',
        normalizedGrams: calculated.normalizedGrams,
        calories: calculated.calories,
        protein: calculated.protein,
        carbs: calculated.carbs,
        fat: calculated.fat,
        fiber: calculated.fiber,
        estimationType: 'ai_estimated',
        confidence: item.confidence || 0.9
      });
    }

    return res.json({
      imageUrl: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      items: calculatedItems
    });
  } catch (error) {
    console.error('API Plate analysis route error:', error);
    return res.status(500).json({ error: `Image Plate analysis failed: ${error.message}` });
  }
});

app.get('/api/ai/status', async (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  return res.json({
    geminiConfigured: hasKey,
    keyPreview: hasKey ? `${process.env.GEMINI_API_KEY.substring(0, 6)}...` : null
  });
});

// Start Server Hook
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`FoodPlate Tracking Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to boot backend server due to database sync failure.', err);
});
