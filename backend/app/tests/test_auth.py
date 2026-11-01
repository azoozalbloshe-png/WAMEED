"""
Test cases for authentication endpoints.
"""
import pytest
from fastapi import status
from app.schemas.user import UserCreate


def test_register_user(client, db):
    """Test user registration."""
    user_data = UserCreate(
        email="newuser@example.com",
        username="newuser",
        password="password123"
    )
    
    response = client.post(
        "/api/auth/register",
        json=user_data.dict()
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == user_data.email
    assert data["username"] == user_data.username
    assert "id" in data
    assert "hashed_password" not in data


def test_register_duplicate_email(client, test_user):
    """Test registration with duplicate email."""
    user_data = UserCreate(
        email=test_user.email,
        username="anotheruser",
        password="password123"
    )
    
    response = client.post(
        "/api/auth/register",
        json=user_data.dict()
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_register_duplicate_username(client, test_user):
    """Test registration with duplicate username."""
    user_data = UserCreate(
        email="another@example.com",
        username=test_user.username,
        password="password123"
    )
    
    response = client.post(
        "/api/auth/register",
        json=user_data.dict()
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_login_success(client, test_user):
    """Test successful login."""
    response = client.post(
        "/api/auth/login",
        data={
            "username": test_user.email,
            "password": "testpass123"
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert data["token_type"] == "bearer"
    assert "user_id" in data


def test_login_wrong_password(client, test_user):
    """Test login with wrong password."""
    response = client.post(
        "/api/auth/login",
        data={
            "username": test_user.email,
            "password": "wrongpassword"
        }
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_nonexistent_user(client):
    """Test login with non-existent user."""
    response = client.post(
        "/api/auth/login",
        data={
            "username": "nonexistent@example.com",
            "password": "password123"
        }
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
