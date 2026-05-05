import React from 'react';

const statusLabels = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  blocked: 'Blocked',
  complete: 'Complete',
};

function ProjectList({ loading, onDelete, onStatusChange, projects }) {
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
        return (
          <article className="project-card" key={project.id}>
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

            {taskCount > 0 && (
              <ul className="tasks">
                {project.tasks.map((task) => (
                  <li className={task.completed ? 'done' : ''} key={task.id}>
                    {task.title}
                  </li>
                ))}
              </ul>
            )}

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
