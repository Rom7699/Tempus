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
    const checkQuery = 'SELECT list_id FROM lists WHERE list_id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [listId, userId]);
    
    if (checkResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'List not found or you do not have permission to delete it' }),
      };
    }

    // Check if there are any tasks linked to this list
    const tasksQuery = 'SELECT COUNT(*) as task_count FROM tasks WHERE task_list_id = $1 AND user_id = $2';
    const tasksResult = await pool.query(tasksQuery, [listId, userId]);
    const taskCount = parseInt(tasksResult.rows[0].task_count);

    if (taskCount > 0) {
      return {
        statusCode: 409, // Conflict
        body: JSON.stringify({ 
          message: `Cannot delete list. There are ${taskCount} task(s) linked to this list. Please move or delete the tasks first.`,
          taskCount: taskCount
        }),
      };
    }

    // Delete the list
    const deleteQuery = 'DELETE FROM lists WHERE list_id = $1 AND user_id = $2';
    const deleteResult = await pool.query(deleteQuery, [listId, userId]);

    if (deleteResult.rowCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'List not found or already deleted' }),
      };
    }

    console.log(`List ${listId} deleted successfully for user ${userId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "List deleted successfully",
        deletedListId: listId
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