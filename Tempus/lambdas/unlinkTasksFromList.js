const { getPool } = require('/opt/nodejs/db'); // from DB layer (db.js in /opt)

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

    const listId = event.pathParameters?.listId;
    if (!listId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'List ID is required' }),
      };
    }

    // Parse request body to get task IDs
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid JSON in request body' }),
      };
    }

    const { taskIds } = requestBody;
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Task IDs array is required and must not be empty' }),
      };
    }

    const pool = getPool();
    
    // First, check if the list exists and belongs to the user
    const checkListQuery = 'SELECT list_id, list_name FROM lists WHERE list_id = $1 AND user_id = $2';
    const checkListResult = await pool.query(checkListQuery, [listId, userId]);
    
    if (checkListResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'List not found or you do not have permission to access it' }),
      };
    }

    const listName = checkListResult.rows[0].list_name;

    // Verify that all provided task IDs belong to the user and are linked to this list
    const placeholders = taskIds.map((_, index) => `$${index + 3}`).join(', ');
    const verifyTasksQuery = `
      SELECT task_id, task_name 
      FROM tasks 
      WHERE task_id IN (${placeholders}) 
        AND user_id = $1 
        AND task_list_id = $2
    `;
    
    const verifyParams = [userId, listId, ...taskIds];
    const verifyResult = await pool.query(verifyTasksQuery, verifyParams);
    
    if (verifyResult.rows.length !== taskIds.length) {
      const foundIds = verifyResult.rows.map(row => row.task_id);
      const missingIds = taskIds.filter(id => !foundIds.includes(id));
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: `Some tasks were not found or are not linked to this list`,
          missing_task_ids: missingIds
        }),
      };
    }

    // Unlink the specified tasks from this list by setting task_list_id to NULL
    const unlinkQuery = `
      UPDATE tasks 
      SET task_list_id = NULL 
      WHERE task_id IN (${placeholders}) 
        AND user_id = $1 
        AND task_list_id = $2
      RETURNING task_id, task_name
    `;
    
    const unlinkResult = await pool.query(unlinkQuery, verifyParams);
    const unlinkedTasks = unlinkResult.rows;

    console.log(`Unlinked ${unlinkedTasks.length} tasks from list ${listId} for user ${userId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully unlinked ${unlinkedTasks.length} task(s) from "${listName}"`,
        list_name: listName,
        tasks_unlinked: unlinkedTasks.length,
        unlinked_tasks: unlinkedTasks.map(task => ({
          task_id: task.task_id,
          task_name: task.task_name
        }))
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