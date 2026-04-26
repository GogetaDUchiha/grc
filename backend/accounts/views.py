from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from .models import Organization, UserOrganization
from .serializers import (
    RegisterSerializer, 
    OrganizationSerializer,
    UserOrganizationSerializer,
    UserSerializer
)


class RegisterView(generics.CreateAPIView):
    """User registration endpoint"""
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    """User login endpoint"""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        # Support both email and username login
        user = User.objects.filter(email=email).first()
        if not user or not user.check_password(password):
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class OrganizationViewSet(viewsets.ModelViewSet):
    """ViewSet for Organization CRUD operations"""
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return organizations for current user"""
        return Organization.objects.filter(
            members__user=self.request.user
        ).distinct()

    def perform_create(self, serializer):
        """Create organization with current user as owner"""
        serializer.save(owner=self.request.user)
        # Automatically add owner to organization
        org = serializer.instance
        UserOrganization.objects.create(
            user=self.request.user,
            organization=org,
            role='admin'
        )

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Add a member to organization"""
        org = self.get_object()
        email = request.data.get('email')
        role = request.data.get('role', 'member')
        
        try:
            user = User.objects.get(email=email)
            UserOrganization.objects.create(
                user=user,
                organization=org,
                role=role
            )
            return Response(
                {'message': f'User {email} added to organization'},
                status=status.HTTP_201_CREATED
            )
        except User.DoesNotExist:
            return Response(
                {'error': f'User with email {email} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get all members of organization"""
        org = self.get_object()
        members = org.members.all()
        serializer = UserOrganizationSerializer(members, many=True)
        return Response(serializer.data)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """Get or update current authenticated user"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
