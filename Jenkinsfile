pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 15, unit: 'MINUTES')
    }

    environment {
        IMAGE_NAME = 'homepage-frontend'
        IMAGE_TAG  = "${env.BUILD_NUMBER}"
        COMPOSE_PROJECT_NAME = 'homepage-frontend'
        HOST_PORT  = '8082'
        DOCKER_BUILDKIT = '1'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // npm ci + vite build acontecem dentro do Dockerfile
        stage('Build') {
            steps {
                sh 'docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest .'
            }
        }

        stage('Deploy') {
            when { expression { env.BRANCH_NAME == 'main' || env.GIT_BRANCH in ['origin/main', 'main'] } }
            steps {
                // A rede do backend precisa existir (pipeline homepage-backend ja executado)
                sh '''
                    docker network inspect homepage_default > /dev/null 2>&1 || {
                        echo "Rede homepage_default nao encontrada: rode antes o pipeline do backend"; exit 1; }
                    docker compose -f compose.prod.yaml up -d --remove-orphans
                '''
            }
        }

        stage('Smoke test') {
            when { expression { env.BRANCH_NAME == 'main' || env.GIT_BRANCH in ['origin/main', 'main'] } }
            steps {
                sh '''
                    for i in $(seq 1 20); do
                        if curl -fsS http://127.0.0.1:${HOST_PORT}/ > /dev/null; then
                            echo "Frontend respondendo"; exit 0
                        fi
                        sleep 2
                    done
                    echo "Frontend nao respondeu a tempo"
                    docker compose -f compose.prod.yaml logs --tail=50 frontend || true
                    exit 1
                '''
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f --filter "until=168h" || true'
        }
    }
}
