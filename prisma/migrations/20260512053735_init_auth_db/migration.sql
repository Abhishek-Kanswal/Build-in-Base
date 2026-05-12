-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "chain_id" TEXT NOT NULL DEFAULT 'eth',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_user_id_created_at_idx" ON "projects"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_project_id_created_at_idx" ON "messages"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_user_id_idx" ON "messages"("user_id");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
