// Contains DynamoDB operations (e.g., add, query tasks)

import { Task } from '../types/task';
import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

// add a task to db
export const addTask = async (taskData: Task) => {
    const params = {
      TableName: 'Tasks',
      Item: {
        ...taskData, // Includes userId, taskId, etc.
      },
    };
  
    await dynamoDb.put(params).promise();
  };

// get all tasks of a user
export const getTasks = async (userId: string) => {
  const params = {
    TableName: 'Tasks',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  };
  const result = await dynamoDb.query(params).promise();
  return result.Items;
};

// get tasks from db by date
export const getTasksByDate = async (userId: string, date: string) => {
    const params = {
      TableName: 'Tasks',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: '#date = :date',
      ExpressionAttributeNames: {
        '#date': 'date',
      },
      ExpressionAttributeValues: {
        ':userId': userId,
        ':date': date,
      },
    };
    const result = await dynamoDb.query(params).promise();
    return result.Items;
  };
  

  // update a task
  export const updateTask = async (userId: string, taskId: string, updates: Partial<Task>) => {
    const updateExpressions: string[] = [];
    const expressionAttributeValues: { [key: string]: any } = {};
    const expressionAttributeNames: { [key: string]: string } = {};
  
    for (const key in updates) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = (updates as any)[key];
    }
  
    const params = {
      TableName: 'Tasks',
      Key: { userId, taskId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
  
    const result = await dynamoDb.update(params).promise();
    return result.Attributes;
  };
  

  // delete a task
  export const deleteTask = async (userId: string, taskId: string) => {
    const params = {
      TableName: 'Tasks',
      Key: { userId, taskId },
    };
  
    await dynamoDb.delete(params).promise();
  };
  