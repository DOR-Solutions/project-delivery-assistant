import React, { useState } from 'react';

const statusLabels = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  blocked: 'Blocked',
  complete: 'Complete',
};

function ProjectList({
  loading,
  onAddTask,
  onDelete,
  onDeleteTask,
  onEdit,
  onStatusChange,
  onToggleTask,
  projects,
}) {
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [taskDrafts, setTaskDrafts] = useState({});

  function startEditing(project) {
    setEditingProjectId(project.id);
    setEditForm({
      title: project.title,
      owner: project.owner,
      status: project.status,
      dueDate: project.dueDate,
      description: project.description,
    });
  }

  function updateEditField(event) {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  }

  function updateTaskDraft(projectId, value) {
    setTaskDrafts((current) => ({ ...current, [projectId]: value }));
  }

  async function submitEdit(event, project) {
    event.preventDefault();
    await onEdit(project, editForm);
    setEditingProjectId(null);
  }

  async function submitTask(event, project) {
    event.preventDefault();
    const title = taskDrafts[project.id] || '';

    if (!title.trim()) {
      return;
    }

    await onAddTask(project, title);
    updateTaskDraft(project.id, '');
  }

  if (loading) {
    return <p className="empty-state">Loading projects...</p>;
  }

  if (!projects.length) {
    return (
      <div className="empty-state">
        <h3>No projects yet</h3>
        <p>Create your first delivery plan to start tracking scope, ownership, and next steps.</p>
      </div>
    );
  }

  return (
    <section className="project-grid">
      {projects.map((project) => {
        const completedTasks = project.tasks.filter((task) => task.completed).length;
        const taskCount = project.tasks.length;
        const isEditing = editingProjectId === project.id;

        return (
          <article className="project-card" key={project.id}>
            {isEditing ? (
              <form className="inline-edit-form" onSubmit={(event) => submitEdit(event, project)}>
                <div className="form-row">
                  <label>
                    Title
                    <input
                      name="title"
                      onChange={updateEditField}
                      required
                      value={editForm.title}
                    />
                  </label>
                  <label>
                    Owner
                    <input
                      name="owner"
                      onChange={updateEditField}
                      value={editForm.owner}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Status
                    <select name="status" onChange={updateEditField} value={editForm.status}>
                      <option value="not-started">Not started</option>
                      <option value="in-progress">In progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="complete">Complete</option>
                    </select>
                  </label>
                  <label>
                    Due
                    <input
                      name="dueDate"
                      onChange={updateEditField}
                      type="date"
                      value={editForm.dueDate}
                    />
                  </label>
                </div>
                <label>
                  Description
                  <textarea
                    name="description"
                    onChange={updateEditField}
                    rows="3"
                    value={editForm.description}
                  />
                </label>
                <div className="card-actions">
                  <button className="secondary-button" type="submit">
                    Save changes
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => setEditingProjectId(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="card-header">
                  <div>
                    <h3>{project.title}</h3>
                    <p>{project.description || 'No description provided.'}</p>
                  </div>
                  <span className={`status-pill status-${project.status}`}>
                    {statusLabels[project.status] || project.status}
                  </span>
                </div>

                <div className="meta-row">
                  <span>Owner: {project.owner || 'Unassigned'}</span>
                  <span>Due: {project.dueDate || 'Not set'}</span>
                  <span>
                    Tasks: {completedTasks}/{taskCount}
                  </span>
                </div>
              </>
            )}

            {taskCount > 0 && (
              <ul className="tasks">
                {project.tasks.map((task) => (
                  <li className={task.completed ? 'done' : ''} key={task.id}>
                    <label>
                      <input
                        checked={task.completed}
                        onChange={() => onToggleTask(project, task.id)}
                        type="checkbox"
                      />
                      <span>{task.title}</span>
                    </label>
                    <button
                      aria-label={`Delete task ${task.title}`}
                      className="task-delete-button"
                      onClick={() => onDeleteTask(project, task.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form className="add-task-form" onSubmit={(event) => submitTask(event, project)}>
              <input
                aria-label={`New task for ${project.title}`}
                onChange={(event) => updateTaskDraft(project.id, event.target.value)}
                placeholder="Add a task"
                value={taskDrafts[project.id] || ''}
              />
              <button className="secondary-button" type="submit">
                Add task
              </button>
            </form>

            <div className="card-actions">
              <select
                aria-label={`Change status for ${project.title}`}
                onChange={(event) => onStatusChange(project, event.target.value)}
                value={project.status}
              >
                <option value="not-started">Not started</option>
                <option value="in-progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="complete">Complete</option>
              </select>
              <button className="ghost-button" onClick={() => startEditing(project)} type="button">
                Edit
              </button>
              <button className="danger-button" onClick={() => onDelete(project.id)} type="button">
                Delete
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default ProjectList;
