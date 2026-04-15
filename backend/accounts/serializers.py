from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Organization, UserProfile

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'

class UserProfileSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer()

    class Meta:
        model = UserProfile
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(source='userprofile')

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'profile')

class RegisterSerializer(serializers.ModelSerializer):
    organization = serializers.PrimaryKeyRelatedField(queryset=Organization.objects.all())

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'organization')

    def create(self, validated_data):
        org = validated_data.pop('organization')
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user, organization=org)
        return user