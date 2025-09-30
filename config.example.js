export const password = "your_password" // Used to upload files, view file tree, view and save note.

export const uploads = {
	folder: "public/uploads", // Relative to project root. If you change this, manually create it and edit .gitignore.
	tempFolder: "temp", // Relative to project root.
	maxFileSize: 5 * 1024 * 1024 * 1024 // In bytes.
}

export const website = {
	host: "http://localhost:3002", // Used for links.
	port: 3002,
	cors: { // Options for cors middleware.
		origin: true, // Set to `false` if you want other websites to link to your files.
	}
}