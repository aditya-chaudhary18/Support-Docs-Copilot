"""Initial schema with pgvector extension and core tables.

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-29 02:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector
from backend.app.core.config import get_settings

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

settings = get_settings()


def upgrade() -> None:
    # 1. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 2. Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('display_name', sa.String(length=100), nullable=False, server_default='Demo User'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Seed initial default user for MVP
    op.execute(
        """
        INSERT INTO users (id, email, display_name, created_at)
        VALUES ('00000000-0000-0000-0000-000000000001', 'demo@trace.local', 'Demo User', NOW())
        ON CONFLICT (id) DO NOTHING;
        """
    )

    # 3. Documents table
    op.create_table(
        'documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_type', sa.String(length=10), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('content_hash', sa.String(length=64), nullable=False),
        sa.Column('r2_object_key', sa.String(length=512), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='uploaded'),
        sa.Column('processing_stage', sa.String(length=30), nullable=True),
        sa.Column('chunk_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('page_count', sa.Integer(), nullable=True),
        sa.Column('processing_error', sa.Text(), nullable=True),
        sa.Column('embedding_model', sa.String(length=100), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('owner_id', 'content_hash', name='uq_documents_owner_content_hash'),
    )
    op.create_index('ix_documents_owner_id', 'documents', ['owner_id'])
    op.create_index('ix_documents_status', 'documents', ['status'])
    op.create_index('ix_documents_owner_status', 'documents', ['owner_id', 'status'])

    # 4. Document Chunks table
    op.create_table(
        'document_chunks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(settings.EMBEDDING_DIMENSION), nullable=True),
        sa.Column('page_number', sa.Integer(), nullable=True),
        sa.Column('section_title', sa.Text(), nullable=True),
        sa.Column('source_location', sa.Text(), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('document_id', 'chunk_index', name='uq_document_chunks_doc_chunk_idx'),
    )
    op.create_index('ix_document_chunks_document_id', 'document_chunks', ['document_id'])

    # 5. Conversations table
    op.create_table(
        'conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False, server_default='New Conversation'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_conversations_owner_id', 'conversations', ['owner_id'])

    # 6. Messages table
    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('sources', sa.JSON(), nullable=True),
        sa.Column('answer_status', sa.String(length=30), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'])


def downgrade() -> None:
    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('document_chunks')
    op.drop_table('documents')
    op.drop_table('users')
