SHELL = /bin/sh
GO_PACKAGE = github.com/dyrector-io/dyrectorio/protobuf/go

## Shortcut to start stack, fully containerized, stable build
.PHONY: up
up:
	cd golang && \
	make up

.PHONY: down
down:
	cd golang && \
	make down

# Shortcut to start stack with local development config
.PHONY: upd
upd:
	cd golang && \
	make upd

.PHONY: downd
downd:
	cd golang && \
	make downd

.PHONY: dwd
dwd: downd

# Shortcut for CLI
.PHONY: cli
cli:
	cd golang/cmd/dyo && \
	go run .

# Create dyrector.io offline installer bundle
.PHONY: bundle
bundle:
	$(eval BUNDLEVER=$(or $(version),latest))
	mv .env .env_bak || true
	echo "DYO_VERSION=$(BUNDLEVER)" > .env
	docker-compose --ansi=never pull
	docker-compose config 2>/dev/null | yq -r '.services[].image' | sort | uniq | while read line ; do \
	docker save $$line | gzip > "offline/$$(echo "$$line" | sed 's/\//\./g; s/\:/\_/g' | cut -d'.' -f3-).tgz" ; done
	cp docker-compose.yaml offline/
	cp .env.example offline/
	zip -r dyrectorio-offline-bundle-$(BUNDLEVER).zip offline
	mv .env_bak .env || true

## Compile the all gRPC files
.PHONY: protogen
protogen:| proto-agent proto-crux

## Generate agent gRPC files
.PHONY: go-lint
go-lint:
	MSYS_NO_PATHCONV=1 docker run --rm -u ${UID}:${GID} -v ${PWD}:/usr/work ghcr.io/dyrector-io/dyrectorio/alpine-proto:3.17-4 ash -c "\
		cd golang && make lint"

## Generate agent gRPC files
.PHONY: proto-agent
proto-agent:
	MSYS_NO_PATHCONV=1 docker run --rm -u ${UID}:${GID} -v ${PWD}:/usr/work ghcr.io/dyrector-io/dyrectorio/alpine-proto:3.17-4 ash -c "\
		mkdir -p protobuf/go && \
		protoc -I. \
			--go_out /tmp \
			--go_opt module=$(REMOTE) \
			--go-grpc_out /tmp \
			--go-grpc_opt module=$(REMOTE) \
			protobuf/proto/*.proto && \
		cp -r /tmp/${GO_PACKAGE}/* ./protobuf/go"

# Generate API grpc files
.PHONY: proto-crux
proto-crux:
	MSYS_NO_PATHCONV=1 docker run --rm -u ${UID}:${GID} -v ${PWD}:/usr/work ghcr.io/dyrector-io/dyrectorio/alpine-proto:3.17-4 ash -c "\
		mkdir -p ./web/crux/src/grpc && \
		protoc \
			--experimental_allow_proto3_optional \
			--plugin=/usr/local/lib/node_modules/ts-proto/protoc-gen-ts_proto \
			--ts_proto_opt=nestJs=true \
			--ts_proto_opt=addNestjsRestParameter=true \
			--ts_proto_opt=outputJsonMethods=true \
			--ts_proto_opt=addGrpcMetadata=true \
			--ts_proto_out=./web/crux/src/grpc \
			protobuf/proto/*.proto" && \
	cp -r protobuf/proto web/crux/ && \
	cd ./web/crux/src/grpc && \
	npx prettier -w "./**.ts"

.PHONY: build-proto-image
build-proto-image:
	docker build -t ghcr.io/dyrector-io/dyrectorio/alpine-proto:3.17-4 -f images/alpine-proto/Dockerfile --progress plain .

.PHONY: branch-check
branch-check:
	@branch=$$(git rev-parse --abbrev-ref HEAD); \
	if [ "$$branch" = "main" ] || [ "$$branch" = "develop" ]; then \
		echo "You are on main / develop branch."; \
	else \
		echo "!!!WARNING: You are not on the main or develop branch!"; \
		exit 1; \
	fi

# use on the branch to-release (develop or main for hotfixes)
.PHONY: release
release: branch-check
	$(info Do you want to continue? Version will be: $(version) from branch: $(shell git rev-parse --abbrev-ref HEAD))
	read

	git pull
	git checkout -b "release/$(version)"

## Create changelog
	git-chglog --next-tag $(version) -o CHANGELOG.md
	git add CHANGELOG.md

## Change the golang version
	sed 's/Version *=.*/Version = "$(version)"/' golang/internal/version/version.go > temp_file && mv temp_file golang/internal/version/version.go
	git add golang/internal/version/version.go

## Change version of crux
	jq '.version = "$(version)"' web/crux/package.json  > web/crux/package.json.tmp
	mv web/crux/package.json.tmp web/crux/package.json
	jq '.version = "$(version)"' web/crux/package-lock.json  > web/crux/package-lock.json.tmp
	mv web/crux/package-lock.json.tmp web/crux/package-lock.json
	git add web/crux/

## Change version of crux-ui
	jq '.version = "$(version)"' web/crux-ui/package.json > web/crux-ui/package.json.tmp
	mv web/crux-ui/package.json.tmp web/crux-ui/package.json
	jq '.version = "$(version)"' web/crux-ui/package-lock.json > web/crux-ui/package-lock.json.tmp
	mv web/crux-ui/package-lock.json.tmp web/crux-ui/package-lock.json
	git add web/crux-ui/

## Finalizing changes
	git commit -m "release: $(version)"
	git tag -sm "$(version)" $(version)

	git checkout -
	git merge --ff-only release/$(version)

.PHONY: test-integration
test-integration:
	cd golang && \
	make test-integration

.PHONY: format
format:
	yamlfmt .

## Generate video with gource, needs ffmpeg and gource installed
.PHONY: gource
gource:
	gource \
		-1920x1080 \
		--seconds-per-day 1 \
		--auto-skip-seconds 1 \
		--file-idle-time 0 \
		--high-dpi \
		--logo ./docs/dyrectorio-dark-small.png \
		--logo-offset 1650x30 \
		--multi-sampling \
		-r 60 \
		-o - | \
		ffmpeg -y -r 60 -f image2pipe -vcodec ppm -i - -vcodec libx264 \
		-preset ultrafast -pix_fmt yuv420p -crf 1 -threads 0 -bf 0 git-history-visualization.mp4
