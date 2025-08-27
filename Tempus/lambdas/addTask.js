const { pool } = require('/opt/db'); // from DB layer (db.js in /opt)
const { v4: uuidv4 } = require('uuid'); // uuid from uuid layer

// const pool = new Pool({
//   host: process.env.PG_HOST,
//   port: parseInt(process.env.PG_PORT),
//   user: process.env.PG_USER,
//   password: process.env.PG_PASSWORD,
//   database: process.env.PG_DATABASE,
//   ssl: {
//     rejectUnauthorized: false
//   }
// }); // content of db.js layer.

exports.handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized User' }),
      };
    }

    const body = JSON.parse(event.body || '{}');

    const {
      task_name,
      task_description,
      task_list_id, 
      task_start_date, 
      task_start_time, 
      task_end_date, 
      task_end_time, 
      task_reminder,
      task_location,
      task_attendees,
      task_priority,
      task_energy_level,
      is_ai_generated = false,
      is_event = false,
      is_completed = null,
    } = body;

    const requiredFields = ['task_name', 'task_start_date', 'task_start_time'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: `Missing required fields: ${missingFields.join(', ')}` }),
      };
    }

    const task = {
      userId,
      taskId: uuidv4(),
      task_name,
      task_description,
      task_list_id,
      task_start_date,
      task_start_time,
      task_end_date,
      task_end_time,
      task_reminder,
      task_location,
      task_attendees,
      task_priority: 1, // default to '1'
      task_energy_level,
      taskCreationDate: new Date().toISOString(),
      is_ai_generated,
      is_event,
      is_completed: is_event ? null : (is_completed ?? false), // null for tasks, true/false for events
    };

    const query = `
      INSERT INTO tasks (
        user_id, task_id, task_name, task_description, task_list_id, 
        task_start_date, task_start_time, task_end_date, task_end_time, task_reminder, 
        task_location, task_attendees, task_priority, task_energy_level, task_creation_date,
        is_ai_generated, is_event, is_completed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,$15,$16,$17,$18)
    `;
    console.log("About to run INSERT query");
    await pool.query(query, [
      task.userId,
      task.taskId,
      task.task_name,
      task.task_description,
      task.task_list_id,
      task.task_start_date,
      task.task_start_time,
      task.task_end_date,
      task.task_end_time,
      task.task_reminder,
      task.task_location,
      task.task_attendees,
      task.task_priority,
      task.task_energy_level,
      task.taskCreationDate,
      task.is_ai_generated,
      task.is_event,
      task.is_completed,
    ]);
    console.log("Query finished");


    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Task Added",
        task: task
      }),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message }),
    };
  }
};
