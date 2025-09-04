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

    // Count tasks currently linked to this list
    const countQuery = 'SELECT COUNT(*) as task_count FROM tasks WHERE task_list_id = $1 AND user_id = $2';
    const countResult = await pool.query(countQuery, [listId, userId]);
    const taskCount = parseInt(countResult.rows[0].task_count);

    if (taskCount === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "No tasks were linked to this list",
          list_name: listName,
          tasks_unlinked: 0
        }),
      };
    }

    // Unlink all tasks from this list by setting task_list_id to NULL
    const unlinkQuery = `
      UPDATE tasks 
      SET task_list_id = NULL 
      WHERE task_list_id = $1 AND user_id = $2
      RETURNING task_id, task_name
    `;
    
    const unlinkResult = await pool.query(unlinkQuery, [listId, userId]);
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