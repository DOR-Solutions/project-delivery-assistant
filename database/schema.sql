CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(100)
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    description TEXT,
    userId INT,
    FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    completed BOOLEAN,
    projectId INT,
    FOREIGN KEY (projectId) REFERENCES projects(id)
);
