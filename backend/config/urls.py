"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from users.views import MyTokenObtainPairView

urlpatterns = [
    # 0. Redirection de la racine vers la documentation API
    path('', RedirectView.as_view(url='/api/docs/', permanent=False), name='root-redirect'),

    # 1. Interface d'administration
    path('admin/', admin.site.urls),

    # 2. Authentification JWT (Login)
    path('api/auth/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # 3. Inclusion des URLs de vos applications
    # Chaque fois que l'URL commence par 'api/', Django va regarder dans ces fichiers
    path('api/', include('dossiers.urls')),
    path('api/', include('comments.urls')),
    path('api/', include('workflow.urls')),
    path('api/', include('analytics.urls')),
    path('api/', include('users.urls')),

    # 4. Documentation interactive (Swagger)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
