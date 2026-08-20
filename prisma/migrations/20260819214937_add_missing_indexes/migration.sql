-- CreateIndex
CREATE INDEX "Document_expiresAt_idx" ON "Document"("expiresAt");

-- CreateIndex
CREATE INDEX "ProgramView_viewedAt_idx" ON "ProgramView"("viewedAt");

-- CreateIndex
CREATE INDEX "ShortlistView_viewedAt_idx" ON "ShortlistView"("viewedAt");
