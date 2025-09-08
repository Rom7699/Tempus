const { getPool } = require('/opt/nodejs/db');
const axios = require('axios');

// API Gateway base URL
const apiBase = "https://b1s33elek9.execute-api.us-east-1.amazonaws.com";

const engagementMessages = {
  goal_creation: [
    {
      title: "🎯 Boost Your Productivity",
      body: "Try adding a new goal to your routine and stay motivated!",
      data: { type: "engagement", action: "create_goal" }
    },
    {
      title: "🌟 Set Your Direction",
      body: "What would you like to achieve this week? Create a goal to stay focused!",
      data: { type: "engagement", action: "create_goal" }
    },
    {
      title: "🚀 Level Up Your Life",
      body: "Turn your dreams into actionable goals. Start with one today!",
      data: { type: "engagement", action: "create_goal" }
    },
    {
      title: "💡 Goals = Success",
      body: "People with clear goals are 10x more likely to succeed. Create yours now!",
      data: { type: "engagement", action: "create_goal" }
    }
  ],
  task_organization: [
    {
      title: "📝 Stay Organized",
      body: "Group similar tasks under one list to work more efficiently!",
      data: { type: "engagement", action: "organize_tasks" }
    },
    {
      title: "🗂️ Organize Your Tasks",
      body: "Create lists to categorize your tasks and boost your productivity!",
      data: { type: "engagement", action: "organize_tasks" }
    },
    {
      title: "📋 Structure Your Day",
      body: "Too many scattered tasks? Group them into organized lists for clarity!",
      data: { type: "engagement", action: "organize_tasks" }
    },
    {
      title: "✨ Clean Up Your Tasks",
      body: "A organized task list = a productive mindset. Try grouping similar tasks!",
      data: { type: "engagement", action: "organize_tasks" }
    }
  ],
  daily_motivation: [
    {
      title: "✨ Make Today Count",
      body: "Small steps lead to big achievements. What will you accomplish today?",
      data: { type: "engagement", action: "view_tasks" }
    },
    {
      title: "🌅 Good Morning!",
      body: "Every day is a fresh start. What's on your agenda today?",
      data: { type: "engagement", action: "view_tasks" }
    },
    {
      title: "💪 You've Got This!",
      body: "Progress happens one task at a time. Ready to tackle your day?",
      data: { type: "engagement", action: "view_tasks" }
    },
    {
      title: "🎯 Focus Time",
      body: "The secret to getting ahead is getting started. Check your tasks!",
      data: { type: "engagement", action: "view_tasks" }
    },
    {
      title: "⭐ Today's Mission",
      body: "Champions are made in the daily grind. What's your priority today?",
      data: { type: "engagement", action: "view_tasks" }
    }
  ],
  weekly_planning: [
    {
      title: "📅 Plan Your Week",
      body: "Set yourself up for success by planning your weekly goals!",
      data: { type: "engagement", action: "weekly_planning" }
    },
    {
      title: "🗓️ Sunday Planning",
      body: "A well-planned week is a productive week. What are your priorities?",
      data: { type: "engagement", action: "weekly_planning" }
    },
    {
      title: "📊 Week Ahead Strategy",
      body: "Take 10 minutes now to plan your week and save hours later!",
      data: { type: "engagement", action: "weekly_planning" }
    },
    {
      title: "🎯 Weekly Focus",
      body: "What 3 things would make this week a success? Plan them now!",
      data: { type: "engagement", action: "weekly_planning" }
    }
  ],
  habit_building: [
    {
      title: "🔄 Build Better Habits",
      body: "Consistent small actions create lasting change. Keep going!",
      data: { type: "engagement", action: "view_habits" }
    },
    {
      title: "🌱 Growth Mindset",
      body: "Every completed task builds stronger habits. You're doing great!",
      data: { type: "engagement", action: "view_habits" }
    },
    {
      title: "💎 Consistency Pays Off",
      body: "Success is built one habit at a time. Stay consistent!",
      data: { type: "engagement", action: "view_habits" }
    },
    {
      title: "🏆 Habit Champion",
      body: "Your future self will thank you for the habits you build today!",
      data: { type: "engagement", action: "view_habits" }
    },
    {
      title: "⚡ Momentum Builder",
      body: "Small wins create big momentum. Keep your streak alive!",
      data: { type: "engagement", action: "view_habits" }
    }
  ]
};

exports.handler = async (event) => {
  try {
    console.log('🎯 Starting engagement notification process...');
    
    const pool = getPool();
    
    // Get active users (users who have push tokens)
    const activeUsersQuery = `
      SELECT DISTINCT upt.user_id,
             COUNT(t.task_id) as task_count,
             COUNT(g.goal_id) as goal_count
      FROM user_push_tokens upt
      LEFT JOIN tasks t ON upt.user_id::text = t.user_id::text
      LEFT JOIN goals g ON upt.user_id::text = g.user_id::text
      WHERE upt.is_active = true 
        AND upt.token_type = 'expo'
      GROUP BY upt.user_id
      ORDER BY upt.user_id
      LIMIT 100
    `;
    
    const usersResult = await pool.query(activeUsersQuery);
    const activeUsers = usersResult.rows;
    
    if (activeUsers.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'No active users found for engagement notifications',
          userCount: 0
        })
      };
    }
    
    console.log(`📱 Processing engagement notifications for ${activeUsers.length} users`);
    
    const results = {
      sent: 0,
      failed: 0,
      skipped: 0
    };
    
    for (const user of activeUsers) {
      try {
        // Determine which message to send based on user patterns
        const message = selectEngagementMessage(user);
        
        if (!message) {
          results.skipped++;
          continue;
        }
        
        // Send notification via API Gateway
        const response = await axios.post(
          `${apiBase}/notifications/send-direct`,
          {
            userId: user.user_id,
            title: message.title,
            body: message.body,
            data: message.data,
            sound: 'default',
            priority: 'default'
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
        
        if (response.status === 200) {
          results.sent++;
        } else {
          results.failed++;
        }
        
      } catch (error) {
        console.error(`Failed to send engagement notification to user ${user.user_id}:`, error.message);
        results.failed++;
      }
    }
    
    console.log(`✅ Engagement notifications complete: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Engagement notifications processed',
        totalUsers: activeUsers.length,
        results: results
      })
    };
    
  } catch (error) {
    console.error('Error processing engagement notifications:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};

function selectEngagementMessage(user) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const taskCount = parseInt(user.task_count) || 0;
  const goalCount = parseInt(user.goal_count) || 0;
  
  let messageType;
  
  // Smart message selection based on user behavior patterns
  
  // Users with many tasks but no goals - suggest organization
  if (taskCount > 10 && goalCount === 0) {
    messageType = "task_organization";
  }
  // Users with no goals - encourage goal creation
  else if (goalCount === 0 && taskCount > 0) {
    messageType = "goal_creation";
  }
  // Sunday - weekly planning
  else if (dayOfWeek === 0) {
    messageType = "weekly_planning";
  }
  // Users with goals - habit building motivation
  else if (goalCount > 0) {
    messageType = "habit_building";
  }
  // Default daily motivation
  else {
    messageType = "daily_motivation";
  }
  
  // Randomly select from the message variants for this type
  const messagesForType = engagementMessages[messageType];
  const randomIndex = Math.floor(Math.random() * messagesForType.length);
  return messagesForType[randomIndex];
}