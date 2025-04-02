package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

const (
	grpcPort = ":50051"
	httpPort = ":8080"
)

func main() {
	// Configurar logger
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Criar listener TCP para gRPC
	lis, err := net.Listen("tcp", grpcPort)
	if err != nil {
		log.Fatalf("falha ao criar listener: %v", err)
	}

	// Criar servidor gRPC
	grpcServer := grpc.NewServer(
		// Adicionar interceptors aqui
	)

	// Registrar serviços gRPC aqui
	// pb.RegisterMeuServicoServer(grpcServer, &server.MeuServicoServer{})

	// Habilitar reflection para ferramentas como grpcurl
	reflection.Register(grpcServer)

	// Criar canal para sinais de término
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Iniciar servidor gRPC em uma goroutine
	go func() {
		log.Printf("Servidor gRPC iniciado na porta %s", grpcPort)
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("falha ao servir: %v", err)
		}
	}()

	// Configurar servidor HTTP (opcional, para gateway REST)
	/*
	mux := runtime.NewServeMux()
	opts := []grpc.DialOption{grpc.WithInsecure()}
	ctx := context.Background()

	// Registrar handlers do gateway aqui
	// err = pb.RegisterMeuServicoHandlerFromEndpoint(ctx, mux, grpcPort, opts)
	*/

	// Aguardar sinal de término
	<-sigChan
	log.Println("Recebido sinal de término")

	// Graceful shutdown
	grpcServer.GracefulStop()
	log.Println("Servidor encerrado com sucesso")
}