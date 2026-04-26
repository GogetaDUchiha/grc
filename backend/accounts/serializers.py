from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Organization, UserOrganization, SECTOR_CHOICES


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer for Organization model"""
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    sector_display = serializers.CharField(source='get_sector_display', read_only=True)
    
    class Meta:
        model = Organization
        fields = ('id', 'name', 'sector', 'sector_display', 'owner', 'owner_email', 'description', 'created_at')
        read_only_fields = ('owner', 'owner_email', 'created_at')


class UserOrganizationSerializer(serializers.ModelSerializer):
    """Serializer for user-organization relationship"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = UserOrganization
        fields = ('id', 'user', 'user_email', 'organization', 'organization_name', 'role', 'created_at')
        read_only_fields = ('created_at',)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    organizations = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'organizations')
        read_only_fields = ('id',)
    
    def get_organizations(self, obj):
        orgs = obj.organizations.all()
        return OrganizationSerializer(orgs, many=True).data


class RegisterSerializer(serializers.Serializer):
    """Serializer for user registration"""
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=8, write_only=True)
    company_name = serializers.CharField(max_length=255)
    sector = serializers.ChoiceField(choices=SECTOR_CHOICES)

    def create(self, validated_data):
        """Create new user and organization"""
        email = validated_data['email']
        username = validated_data['username']
        password = validated_data['password']
        company_name = validated_data['company_name']
        sector = validated_data['sector']
        
        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        # Create organization
        organization = Organization.objects.create(
            name=company_name,
            sector=sector,
            owner=user
        )
        
        # Link user to organization as admin
        UserOrganization.objects.create(
            user=user,
            organization=organization,
            role='admin'
        )
        
        return user

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken")
        return value