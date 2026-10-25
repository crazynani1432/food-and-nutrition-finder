const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const seedFoods = require('../utils/seedData');

// Resolve database storage path
const dbPath = path.resolve(__dirname, '../../database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

// Model Declarations
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

const UserProfile = sequelize.define('UserProfile', {
  userId: {
    type: DataTypes.UUID,
    primaryKey: true
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  age: DataTypes.INTEGER,
  heightCm: DataTypes.FLOAT,
  weightKg: DataTypes.FLOAT,
  activityLevel: DataTypes.STRING, // sedentary, lightly_active, moderately_active, very_active
  fitnessGoal: DataTypes.STRING,   // lose_weight, maintain_weight, gain_weight
  dietaryPreference: {
    type: DataTypes.STRING,
    defaultValue: 'omnivore'        // vegetarian, vegan, jain, eggitarian
  },
  allergenList: DataTypes.TEXT,     // comma-separated list
  dailyCalorieTarget: DataTypes.INTEGER,
  dailyProteinTargetG: DataTypes.FLOAT,
  dailyCarbsTargetG: DataTypes.FLOAT,
  dailyFatTargetG: DataTypes.FLOAT,
  dailyFiberTargetG: DataTypes.FLOAT
});

const Food = sequelize.define('Food', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  regionalName: DataTypes.STRING,
  foodType: {
    type: DataTypes.STRING,
    defaultValue: 'cooked' // raw, cooked, packaged
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  barcode: DataTypes.STRING,
  servingSizeDefault: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  servingUnitDefault: {
    type: DataTypes.STRING,
    allowNull: false // g, ml, piece, cup, bowl, slice
  },
  conversionToGrams: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1.0
  },
  caloriesPer100g: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  proteinPer100g: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  carbsPer100g: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  fatPer100g: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  fiberPer100g: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  sodiumPer100g: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  }
});

const Meal = sequelize.define('Meal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  mealType: {
    type: DataTypes.STRING,
    allowNull: false // Breakfast, Lunch, Dinner, Snack, Custom
  },
  logDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  logTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  totalCalories: DataTypes.FLOAT,
  totalProteinG: DataTypes.FLOAT,
  totalCarbsG: DataTypes.FLOAT,
  totalFatG: DataTypes.FLOAT,
  totalFiberG: DataTypes.FLOAT,
  analysisMethod: {
    type: DataTypes.STRING,
    allowNull: false // image, manual, hybrid
  },
  imageUrl: DataTypes.TEXT
});

const MealItem = sequelize.define('MealItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  mealId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  foodId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  loggedQuantity: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  loggedUnit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  normalizedGrams: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  calories: DataTypes.FLOAT,
  protein: DataTypes.FLOAT,
  carbs: DataTypes.FLOAT,
  fat: DataTypes.FLOAT,
  fiber: DataTypes.FLOAT,
  estimationType: {
    type: DataTypes.STRING,
    defaultValue: 'verified_db' // verified_db, ai_estimated, user_corrected
  }
});

// Relationships
User.hasOne(UserProfile, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserProfile.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Meal, { foreignKey: 'userId', onDelete: 'CASCADE' });
Meal.belongsTo(User, { foreignKey: 'userId' });

Meal.hasMany(MealItem, { foreignKey: 'mealId', onDelete: 'CASCADE' });
MealItem.belongsTo(Meal, { foreignKey: 'mealId' });

Food.hasMany(MealItem, { foreignKey: 'foodId', onDelete: 'RESTRICT' });
MealItem.belongsTo(Food, { foreignKey: 'foodId' });

// Initialize Database Function
async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('SQLite database connection established successfully.');

    // Sync models to database schemas
    await sequelize.sync();
    try {
      const tableInfo = await sequelize.getQueryInterface().describeTable('Users');
      if (!tableInfo.name) {
        await sequelize.getQueryInterface().addColumn('Users', 'name', {
          type: DataTypes.STRING,
          allowNull: true
        });
      }
    } catch (colErr) {
      // Column might already exist
    }

    try {
      const profileInfo = await sequelize.getQueryInterface().describeTable('UserProfiles');
      if (profileInfo && !profileInfo.isCompleted) {
        await sequelize.getQueryInterface().addColumn('UserProfiles', 'isCompleted', {
          type: DataTypes.BOOLEAN,
          defaultValue: false
        });
      }
    } catch (colErr2) {
      // Column might already exist
    }
    console.log('Database schemas synchronized.');

    // Check if foods table requires seeding
    const foodCount = await Food.count();
    if (foodCount === 0) {
      console.log('Seeding initial verified Indian foods database...');
      await Food.bulkCreate(seedFoods);
      console.log('Foods database seeded successfully.');
    }
  } catch (error) {
    console.error('Unable to initialize the SQLite database:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  User,
  UserProfile,
  Food,
  Meal,
  MealItem,
  initDatabase
};
