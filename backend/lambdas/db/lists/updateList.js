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

    const body = JSON.parse(event.body || '{}');
    const {
      list_name,
      list_color,
      list_icon,
    } = body;

    // Validate that at least one field is being updated
    if (!list_name && !list_color && !list_icon) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'At least one field must be provided for update' }),
      };
    }

    const pool = getPool();
    
    // First, check if the list exists and belongs to the user
    const checkQuery = 'SELECT list_id FROM lists WHERE list_id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [listId, userId]);
    
    if (checkResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'List not found or you do not have permission to update it' }),
      };
    }

    // Build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (list_name !== undefined) {
      updateFields.push(`list_name = $${paramCount}`);
      updateValues.push(list_name);
      paramCount++;
    }

    if (list_color !== undefined) {
      updateFields.push(`list_color = $${paramCount}`);
      updateValues.push(list_color);
      paramCount++;
    }

    if (list_icon !== undefined) {
      updateFields.push(`list_icon = $${paramCount}`);
      updateValues.push(list_icon);
      paramCount++;
    }

    // Add WHERE clause parameters
    updateValues.push(listId, userId);
    const whereClause = `WHERE list_id = $${paramCount} AND user_id = $${paramCount + 1}`;

    const updateQuery = `
      UPDATE lists 
      SET ${updateFields.join(', ')} 
      ${whereClause}
      RETURNING list_id, list_name, list_color, list_icon, user_id
    `;

    console.log('Update query:', updateQuery);
    console.log('Update values:', updateValues);

    const result = await pool.query(updateQuery, updateValues);

    if (result.rowCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'List not found or no changes were made' }),
      };
    }

    const updatedList = result.rows[0];
    console.log(`List ${listId} updated successfully for user ${userId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "List updated successfully",
        list: updatedList
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