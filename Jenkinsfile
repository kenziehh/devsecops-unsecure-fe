pipeline {
    agent any

    environment {
        IMAGE_NAME = 'unsecure-cashflow-fe-app'
        STAGING_PORT = '3011'
        PROD_PORT = '3010'
        INTERNAL_PORT = '3001'
        SONAR_PROJECT_KEY = 'unsecure-cashflow-fe-app'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10', daysToKeepStr: '30'))
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/kenziehh/devsecops-unsecure-fe.git', branch: 'main'
            }
        }

        stage('Build') {
            steps {
                script {
                    echo "🐳 Building Docker image..."
                    sh """
                        docker build \
                            --build-arg VERSION=${env.BUILD_NUMBER} \
                            -t ${IMAGE_NAME}:${env.BUILD_NUMBER} \
                            -t ${IMAGE_NAME}:latest \
                            -f Dockerfile.prod .
                        echo "✅ Image built: ${IMAGE_NAME}:${env.BUILD_NUMBER}"
                    """
                }
            }
        }

        stage('Semgrep SAST') {
          steps {
            sh '''
                echo workspace files...
                ls -la ${PWD}
                docker run --rm \
                  -v "${PWD}:/src" \
                  semgrep/semgrep semgrep \
                  --config=p/javascript \
                  --config="r/typescript.nextjs.react-nextjs-router-create-element-dangerouslysetinnerhtml.react-nextjs-router-create-element-dangerouslysetinnerhtml" \
                  --verbose \
                  --no-git-ignore \
                  --json \
                  2>&1 | tee validation.log
            '''
          }
        }

        stage('SAST - SonarQube Analysis') {
            steps {
                script {
                    echo "🔍 Running SonarQube analysis..."
                    withSonarQubeEnv('SonarQube') {
                        sh """
                            sonar-scanner \
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                -Dsonar.sources=. \
                                -Dsonar.exclusions=**/node_modules/**,**/.next/**,**/dist/**,**/build/**,**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx \
                                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                                -Dsonar.typescript.lcov.reportPaths=coverage/lcov.info
                        """
                    }
                    echo "⏳ Waiting for SonarQube Quality Gate result..."
                    timeout(time: 5, unit: 'MINUTES') {
                        def qualityGate = waitForQualityGate()
                        if (qualityGate.status != 'OK') {
                            error "Quality gate failed: ${qualityGate.status}"
                        }
                    }
                }
            }
        }

        stage('Deploy Staging') {
            steps {
                script {
                    echo "🚀 Deploying to staging..."
                    sh """
                        # Staging environment variables
                        cat > .env <<EOF
NEXT_PUBLIC_BASE_URL=https://api-cashflow.nflrmvs.cloud/api/v1
NEXTAUTH_SECRET=staging_secret_change_me
NEXTAUTH_URL=http://localhost:${STAGING_PORT}
NODE_ENV=production
APP_PORT=${STAGING_PORT}
EOF

                        # Staging port overrides
                        cat > docker-compose.staging.yml <<EOF
services:
  nextjs:
    image: ${IMAGE_NAME}:latest
    container_name: unsecure-cashflow-fe-staging
    ports:
      - "${STAGING_PORT}:${INTERNAL_PORT}"
EOF

                        # Stop existing staging
                        docker compose -p staging -f docker-compose.prod.yml -f docker-compose.staging.yml --env-file .env down 2>/dev/null || true

                        # Deploy staging
                        docker compose -p staging -f docker-compose.prod.yml -f docker-compose.staging.yml --env-file .env up -d

                        # Wait for services
                        echo "⏳ Waiting for services..."
                        sleep 10

                        # Verify deployment
                        docker compose -p staging -f docker-compose.prod.yml -f docker-compose.staging.yml ps

                        if docker compose -p staging -f docker-compose.prod.yml -f docker-compose.staging.yml ps | grep -q "Up"; then
                            echo "✅ Staging deployed: http://localhost:${STAGING_PORT}"
                        else
                            echo "⚠️ App may be restarting, checking logs..."
                            docker compose -p staging -f docker-compose.prod.yml -f docker-compose.staging.yml logs --tail=50
                        fi
                    """
                }
            }
        }

        stage('Image Scan Trivy') {
            steps {
                script {
                    echo "🔒 Running Trivy image scan..."
                    sh """
                        trivy image --severity HIGH,CRITICAL  \
                        --skip-dirs /usr/local/lib/node_modules \
                        --exit-code 1 ${IMAGE_NAME}:latest || {
                            echo "❌ Vulnerabilities found in the image image!"
                            exit 1
                        }
                        echo "✅ No HIGH or CRITICAL vulnerabilities found."
                    """
                }
            }
        }

        stage('DAST - OWASP ZAP Scan') {
            steps {
                script {
                    echo "🛡️ Running OWASP ZAP DAST scan..."
                    sh """
                        # Start ZAP
                        docker run --rm -u 0 \
                          --network staging_unsecure_app_network \
                          -v \$(pwd):/zap/wrk \
                          -t zaproxy/zap-stable zap-baseline.py \
                          -t http://unsecure-cashflow-fe-staging:${STAGING_PORT} \
                          -r zap-report.html \\
                          -w zap-report.md \\
                          -J zap-report.json \\
                          -I
                    """
                }
            }
        }

        stage('Deploy Production') {
            steps {
                script {
                    input message: '🚀 Deploy to Production?', ok: 'Deploy', submitter: 'admin,devops'

                    echo "🚀 Deploying to production..."
                    sh """
                        # Stop staging first
                        echo "🛑 Stopping staging..."
                        docker compose -p staging -f docker-compose.prod.yml -f docker-compose.staging.yml down 2>/dev/null || true

                        # Delete existing .env
                        rm -f .env

                        # Create production .env
                        cat > .env <<EOF
NEXT_PUBLIC_BASE_URL=https://api-cashflow.nflrmvs.cloud/api/v1
NEXTAUTH_SECRET=production_secret_change_me
NEXTAUTH_URL=https://cashflow.nflrmvs.cloud
NODE_ENV=production
APP_PORT=${PROD_PORT}
EOF

                        # Stop existing production
                        docker compose -f docker-compose.prod.yml down 2>/dev/null || true

                        # Deploy production
                        docker compose -f docker-compose.prod.yml --env-file .env up -d

                        # Wait for services
                        echo "⏳ Waiting for services..."
                        sleep 10

                        # Verify deployment
                        docker compose -f docker-compose.prod.yml ps

                        if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
                            echo "✅ Production deployed: http://localhost:${PROD_PORT}"
                        else
                            echo "⚠️ Deployment issue, checking logs..."
                            docker compose -f docker-compose.prod.yml logs --tail=30
                        fi
                    """
                }
            }
        }
    }

    post {
        always {
            sh """
                # Clean old images (keep last 5)
                docker images ${IMAGE_NAME} --format "{{.Tag}}" | \
                    grep -E '^[0-9]+\$' | sort -rn | tail -n +6 | \
                    xargs -I {} docker rmi ${IMAGE_NAME}:{} 2>/dev/null || true
                docker image prune -f
            """
        }
        success { echo "✅ Deployment completed successfully" }
        failure { echo "❌ Deployment failed" }
    }
}
