"""
SQLAlchemy Declarative Base.
All database models inherit from this base class.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
