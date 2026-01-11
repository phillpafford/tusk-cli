-- Using COPY syntax for parity check
COPY users (id, username, email) FROM stdin;
1	jdoe	john@example.com
2	asmith	alice@example.com
\

SELECT setval('users_id_seq', 2, true);

COPY posts (id, user_id, content) FROM stdin;
1	1	Hello from John
2	1	Another post
3	2	Alice says hi
\

SELECT setval('posts_id_seq', 3, true);
