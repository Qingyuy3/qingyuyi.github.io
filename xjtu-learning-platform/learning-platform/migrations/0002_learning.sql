CREATE TABLE assignments (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
 module INTEGER NOT NULL CHECK(module BETWEEN 1 AND 8), deadline INTEGER,
 closed INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE uploads (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES user(id),
 kind TEXT NOT NULL CHECK(kind IN ('submission','material')),
 assignment_id TEXT REFERENCES assignments(id), title TEXT NOT NULL,
 module INTEGER NOT NULL CHECK(module BETWEEN 1 AND 8), filename TEXT NOT NULL,
 bytes INTEGER NOT NULL CHECK(bytes > 0 AND bytes <= 104857600),
 object_key TEXT NOT NULL UNIQUE, multipart_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'uploading' CHECK(status IN ('uploading','completing','ready','cancelled')),
 created_at INTEGER NOT NULL, completed_at INTEGER,
 feedback TEXT NOT NULL DEFAULT '', grade REAL CHECK(grade BETWEEN 0 AND 100)
);
CREATE INDEX uploads_owner_status ON uploads(owner_id,status);
CREATE INDEX uploads_assignment_status ON uploads(assignment_id,status);
CREATE TABLE upload_parts (
 upload_id TEXT NOT NULL REFERENCES uploads(id), part_number INTEGER NOT NULL,
 etag TEXT NOT NULL, bytes INTEGER NOT NULL,
 PRIMARY KEY(upload_id,part_number)
);
CREATE TABLE posts (
 id TEXT PRIMARY KEY, author_id TEXT NOT NULL REFERENCES user(id),
 parent_id TEXT REFERENCES posts(id), body TEXT NOT NULL,
 created_at INTEGER NOT NULL, hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX posts_parent_created ON posts(parent_id,created_at);
CREATE TABLE counters (
 key TEXT NOT NULL, window INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(key,window)
);
CREATE TABLE audit (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL,
 target_id TEXT NOT NULL, created_at INTEGER NOT NULL
);
