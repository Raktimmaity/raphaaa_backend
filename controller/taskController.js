const Task = require("../models/taskModel");

// Create new task
const createTask = async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const task = new Task({
    user: req.user._id,
    name: req.user.name,
    email: req.user.email,
    title,
    description,
  });

  const createdTask = await task.save();
  res.status(201).json(createdTask);
};

// Get user tasks
const getMyTasks = async (req, res) => {
  const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(tasks);
};

// Delete task
const deleteTask = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  if (task.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized");
  }

  await task.remove();
  res.json({ message: "Task removed" });
};

module.exports = {
  createTask,
  getMyTasks,
  deleteTask,
};
