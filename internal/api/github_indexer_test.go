package api

import (
	"context"
	"encoding/csv"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	models "github.com/protoai/github_models/v1"
	indexer "github.com/protoai/github_indexer/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func TestGitHubIndexerGetData(t *testing.T) {
	// Abrir e ler o arquivo CSV
	csvPath := filepath.Join("proto", "github_models", "v1", "projects.csv")
	file, err := os.Open(csvPath)
	if err != nil {
		t.Fatalf("Erro ao abrir arquivo CSV: %v", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	// Pular o cabeçalho
	_, err = reader.Read()
	if err != nil {
		t.Fatalf("Erro ao ler cabeçalho do CSV: %v", err)
	}

	// Ler a primeira linha de dados
	record, err := reader.Read()
	if err != nil {
		t.Fatalf("Erro ao ler linha do CSV: %v", err)
	}

	// Extrair owner e repo do repositório GitHub
	repoURL := record[6] // Índice da coluna 'repositorio'
	parts := strings.Split(repoURL, "/")
	owner := parts[len(parts)-2]
	repoName := parts[len(parts)-1]

	// Criar uma instância do serviço
	service := NewGitHubIndexerService()

	// Criar a requisição
	req := &indexer.GetDataRequest{
		Owner:    owner,
		RepoName: repoName,
		IncludeReadme: true, // Solicitar informações do README
	}

	// Executar a chamada do serviço
	resp, err := service.GetData(context.Background(), req)
	if err != nil {
		t.Fatalf("Erro ao chamar GetData: %v", err)
	}

	// Verificar se a resposta não é nula
	if resp == nil || resp.RepoData == nil {
		t.Fatal("Resposta ou dados do repositório são nulos")
	}

	// Verificar se os dados básicos correspondem ao CSV
	expectedRepo := &models.GitHubRepo{
		Name:        repoName,
		FullName:    owner + "/" + repoName,
		Description: record[2], // Índice da coluna 'descricao'
		HtmlUrl:     record[6], // Índice da coluna 'repositorio'
		CreatedAt:   timestamppb.Now(),
		UpdatedAt:   timestamppb.Now(),
		Owner: &models.GitHubUser{
			Login:     owner,
			AvatarUrl: "", // Não temos essa informação no CSV
			HtmlUrl:   "https://github.com/" + owner,
			Type:      "Organization",
		},
	}

	// Verificar campos específicos
	if resp.RepoData.Name != expectedRepo.Name {
		t.Errorf("Nome do repositório incorreto. Esperado: %s, Obtido: %s", expectedRepo.Name, resp.RepoData.Name)
	}

	if resp.RepoData.FullName != expectedRepo.FullName {
		t.Errorf("Nome completo incorreto. Esperado: %s, Obtido: %s", expectedRepo.FullName, resp.RepoData.FullName)
	}

	if resp.RepoData.Description != expectedRepo.Description {
		t.Errorf("Descrição incorreta. Esperado: %s, Obtido: %s", expectedRepo.Description, resp.RepoData.Description)
	}

	// Verificar se o README foi obtido
	if resp.ReadmeContent == "" {
		t.Error("README não foi obtido do repositório")
	}

	// Verificar se o conteúdo do README contém informações úteis
	if !strings.Contains(resp.ReadmeContent, "# ") && !strings.Contains(resp.ReadmeContent, "## ") {
		t.Error("README parece não conter seções estruturadas (títulos com #)")
	}

	// Verificar se conseguimos extrair informações relevantes do README
	readmeInfo := resp.GetReadmeInfo()
	if readmeInfo == nil {
		t.Fatal("Não foi possível extrair informações estruturadas do README")
	}

	// Verificar campos específicos extraídos do README
	if readmeInfo.Description == "" {
		t.Error("Descrição não foi extraída do README")
	}

	if len(readmeInfo.Features) == 0 {
		t.Error("Nenhuma funcionalidade foi extraída do README")
	}

	if readmeInfo.Installation == "" {
		t.Error("Instruções de instalação não foram extraídas do README")
	}

	if readmeInfo.Usage == "" {
		t.Error("Instruções de uso não foram extraídas do README")
	}
}