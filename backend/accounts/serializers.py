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
    first_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(min_length=6, write_only=True)
    sector = serializers.ChoiceField(choices=SECTOR_CHOICES, default='Fintech')

    def create(self, validated_data):
        """Create new user and organization"""
        import uuid
        email = validated_data['email']
        password = validated_data['password']
        sector = validated_data.get('sector', 'Fintech')
        
        # Generate username and company name
        username = email.split('@')[0] + "_" + str(uuid.uuid4())[:8]
        company_name = email.split('@')[1] if '@' in email else 'My Company'
        
        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
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